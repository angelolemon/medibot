// Create an MP preapproval (subscription) for the authenticated doctor.
//
// Lives at /api/mp-create-subscription on Vercel. The client tokenizes the
// card with the MP JS SDK, then posts { planId, cardToken, payerEmail } here.
// We POST /preapproval to MP with our user_id as external_reference, so every
// future webhook event for this subscription lands with a reliable identifier
// we can match against profiles.id.
//
// This replaces the old redirect flow (?preapproval_plan_id=X) which couldn't
// carry external_reference and forced us to build heuristics to reconcile the
// subscription back to the user. With the API-based flow we know exactly who
// the sub belongs to the moment we create it.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const MP_ACCESS_TOKEN = (process.env.MP_ACCESS_TOKEN ?? '').trim()
const MP_PLAN_ID_PRO = (process.env.MP_PLAN_ID_PRO ?? '').trim()
const MP_PLAN_ID_CLINIC = (process.env.MP_PLAN_ID_CLINIC ?? '').trim()
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim()
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: any = null
// Intentionally typed as `any` — we don't wire a generated Database type
// through to these serverless functions, and Supabase's strict inference
// collapses untyped `.from(table).insert(...)` calls to `never[]`, which
// makes every insert a type error. Shape validation happens at the handler
// level (we construct the literals ourselves), so the runtime is safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function admin(): any {
  if (!_admin) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing')
    }
    _admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  }
  return _admin
}

function cors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'authorization, content-type, x-client-info',
  )
}

interface MPPreapprovalResponse {
  id: string
  status: 'pending' | 'authorized' | 'paused' | 'cancelled'
  reason: string
  payer_id?: number
  auto_recurring: {
    transaction_amount: number
    currency_id: string
    free_trial?: { frequency: number; frequency_type: string }
  }
  next_payment_date?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  // Resolve caller.
  const authHeader = (req.headers.authorization as string) ?? ''
  const jwt = authHeader.replace('Bearer ', '').trim()
  if (!jwt) return res.status(401).json({ error: 'missing_auth' })

  let userId: string | null = null
  let userEmail: string | null = null
  try {
    const { data, error } = await admin().auth.getUser(jwt)
    if (error || !data.user) throw error ?? new Error('no user')
    userId = data.user.id
    userEmail = data.user.email ?? null
  } catch (err) {
    console.error('auth failed', err)
    return res.status(401).json({ error: 'invalid_auth' })
  }

  const body: { planId?: string; cardToken?: string; payerEmail?: string } =
    typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
  const planId = body.planId
  if (planId !== 'pro' && planId !== 'clinic') {
    return res.status(400).json({ error: 'invalid_plan' })
  }
  const cardToken = (body.cardToken ?? '').trim()
  if (!cardToken) return res.status(400).json({ error: 'missing_card_token' })

  // Payer email: prefer what the Brick collected (so it matches the card),
  // fall back to the authenticated user's email if absent.
  const payerEmail = (body.payerEmail ?? userEmail ?? '').trim().toLowerCase()
  if (!payerEmail) return res.status(400).json({ error: 'missing_payer_email' })

  const mpPlanId = planId === 'clinic' ? MP_PLAN_ID_CLINIC : MP_PLAN_ID_PRO
  if (!mpPlanId) return res.status(500).json({ error: 'plan_not_configured' })

  // Create the preapproval via API. This is the critical difference from the
  // old redirect flow: we pass external_reference = our user_id, so every
  // future webhook event for this sub is trivially matchable back to the user.
  //
  // MP requires preapproval_plan_id + card_token_id + payer_email on creation.
  // Any field defined on the plan (amount, frequency, trial, back_url) is
  // inherited; we don't need to re-send them here.
  const mpRes = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      preapproval_plan_id: mpPlanId,
      card_token_id: cardToken,
      payer_email: payerEmail,
      external_reference: userId,
      status: 'authorized',
    }),
  })

  if (!mpRes.ok) {
    const text = await mpRes.text()
    console.error('MP preapproval POST failed', mpRes.status, text.slice(0, 500))
    // Try to surface a useful error message to the UI. MP's error format is
    // typically { message, cause: [{code, description}] } or similar.
    let msg = 'MercadoPago rechazó la suscripción.'
    try {
      const parsed = JSON.parse(text) as {
        message?: string
        cause?: Array<{ description?: string; code?: string | number }>
      }
      msg = parsed.cause?.[0]?.description || parsed.message || msg
    } catch {
      /* keep default */
    }
    return res.status(400).json({ error: 'mp_rejected', message: msg })
  }

  const pre = (await mpRes.json()) as MPPreapprovalResponse

  // Write the link into profiles immediately — no waiting for webhook.
  const plan = planId
  const planStatus = pre.auto_recurring.free_trial ? 'trialing' : 'active'
  const update: Record<string, unknown> = {
    mp_preapproval_id: pre.id,
    mp_payer_id: pre.payer_id ? String(pre.payer_id) : null,
    plan,
    plan_status: planStatus,
  }
  if (pre.next_payment_date) {
    update.plan_valid_until = pre.next_payment_date
    if (pre.auto_recurring.free_trial) update.plan_trial_ends_at = pre.next_payment_date
  }
  const { error: upErr } = await admin().from('profiles').update(update).eq('id', userId!)
  if (upErr) console.error('profile update after preapproval failed', upErr)

  await admin().from('billing_events').insert({
    user_id: userId,
    event_type: `preapproval.${pre.status}`,
    mp_resource_id: pre.id,
    mp_resource_type: 'preapproval',
    amount: pre.auto_recurring.transaction_amount,
    currency: pre.auto_recurring.currency_id,
    status: pre.status,
    raw_payload: pre as unknown as Record<string, unknown>,
    source: 'api',
  })

  return res.status(200).json({
    ok: true,
    plan,
    status: planStatus,
    validUntil: pre.next_payment_date ?? null,
    preapprovalId: pre.id,
  })
}
