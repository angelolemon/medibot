// Link an MP preapproval to the authenticated doctor.
//
// Lives at /api/mp-link-subscription on Vercel.
//
// Why this exists: MP's "suscripción con plan" redirect flow doesn't accept
// external_reference as a query param (SUB03), and MP's preapproval API
// doesn't return payer_email reliably — so the webhook has no way to match
// the subscription back to one of our users on its own.
//
// Solution: when MP redirects the doctor back to `/planes?upgrade=success&
// preapproval_id=X` after a successful checkout, the client posts the id
// here. We verify the JWT, pull the preapproval from MP, and write the link
// (mp_preapproval_id + plan + status + validity) to profiles. From that
// point on every future webhook for that preapproval_id finds the user by
// profiles.mp_preapproval_id.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

const MP_ACCESS_TOKEN = (process.env.MP_ACCESS_TOKEN ?? '').trim()
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim()
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()

let _admin: ReturnType<typeof createClient> | null = null
function admin() {
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

interface MPPreapproval {
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

function planFromReason(reason: string): 'pro' | 'clinic' | null {
  const r = reason.toLowerCase()
  if (r.includes('clinic')) return 'clinic'
  if (r.includes('pro')) return 'pro'
  return null
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
  try {
    const { data, error } = await admin().auth.getUser(jwt)
    if (error || !data.user) throw error ?? new Error('no user')
    userId = data.user.id
  } catch {
    return res.status(401).json({ error: 'invalid_auth' })
  }

  const body: { preapprovalId?: string } =
    typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
  const preapprovalId = (body.preapprovalId ?? '').trim()
  if (!preapprovalId) return res.status(400).json({ error: 'missing_preapproval_id' })

  // Pull the preapproval from MP — never trust the client-supplied id blindly.
  const r = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  })
  if (!r.ok) {
    const text = await r.text()
    console.error('MP preapproval fetch failed', r.status, text.slice(0, 300))
    return res.status(400).json({ error: 'preapproval_not_found' })
  }
  const pre = (await r.json()) as MPPreapproval

  const plan = planFromReason(pre.reason) ?? 'pro'
  let planStatus: string
  if (pre.status === 'authorized') {
    planStatus = pre.auto_recurring.free_trial ? 'trialing' : 'active'
  } else if (pre.status === 'paused') {
    planStatus = 'past_due'
  } else if (pre.status === 'cancelled') {
    planStatus = 'cancelled'
  } else {
    planStatus = 'active'
  }

  const update: Record<string, unknown> = {
    mp_preapproval_id: pre.id,
    mp_payer_id: pre.payer_id ? String(pre.payer_id) : null,
    plan,
    plan_status: planStatus,
  }
  if (pre.next_payment_date) {
    update.plan_valid_until = pre.next_payment_date
    // When there's a trial, next_payment_date is the end of trial.
    if (pre.auto_recurring.free_trial) update.plan_trial_ends_at = pre.next_payment_date
  }

  const { error: upErr } = await admin().from('profiles').update(update).eq('id', userId!)
  if (upErr) {
    console.error('profile update failed', upErr)
    return res.status(500).json({ error: 'profile_update_failed' })
  }

  await admin().from('billing_events').insert({
    user_id: userId,
    event_type: `preapproval.${pre.status}`,
    mp_resource_id: pre.id,
    mp_resource_type: 'preapproval',
    amount: pre.auto_recurring.transaction_amount,
    currency: pre.auto_recurring.currency_id,
    status: pre.status,
    raw_payload: pre as unknown as Record<string, unknown>,
    source: 'link',
  })

  return res.status(200).json({
    ok: true,
    plan,
    status: planStatus,
    validUntil: pre.next_payment_date ?? null,
  })
}
