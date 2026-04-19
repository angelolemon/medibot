// Create an MP preapproval redirect URL for the authenticated doctor.
//
// Lives at /api/mp-create-subscription on Vercel. The client calls this with
// the user's Supabase JWT; we resolve the user, confirm the plan, and return
// the MP checkout URL for a browser redirect.

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// .trim() defensively — Vercel env var inputs sometimes capture trailing
// newlines when values are pasted from the terminal. A stray \n in the plan
// id becomes %0A in the URL and MP returns SUB03.
const MP_PLAN_ID_PRO = (process.env.MP_PLAN_ID_PRO ?? '').trim()
const MP_PLAN_ID_CLINIC = (process.env.MP_PLAN_ID_CLINIC ?? '').trim()
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  // Resolve caller from the Supabase JWT.
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

  const body: { planId?: string } =
    typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {})
  const planId = body.planId
  if (planId !== 'pro' && planId !== 'clinic') {
    return res.status(400).json({ error: 'invalid_plan' })
  }

  const mpPlanId = planId === 'clinic' ? MP_PLAN_ID_CLINIC : MP_PLAN_ID_PRO
  if (!mpPlanId) return res.status(500).json({ error: 'plan_not_configured' })

  // Redirect flow: MP's "suscripción con plan" checkout rejects any extra
  // query param (external_reference, payer_email, back_url) with SUB03. We
  // send only preapproval_plan_id and reconcile the user on webhook by
  // matching payer_email (returned by MP API) against profiles.email.
  const initPoint = new URL('https://www.mercadopago.com.ar/subscriptions/checkout')
  initPoint.searchParams.set('preapproval_plan_id', mpPlanId)
  // Intentionally no payer_email / external_reference — they trigger SUB03.
  void userEmail

  // Audit log
  try {
    await admin().from('billing_events').insert({
      user_id: userId,
      event_type: 'preapproval.requested',
      mp_resource_id: mpPlanId,
      mp_resource_type: 'preapproval_plan',
      status: 'pending',
      source: 'api',
    })
  } catch (err) {
    console.warn('audit log failed (non-fatal)', err)
  }

  return res.status(200).json({ init_point: initPoint.toString() })
}
