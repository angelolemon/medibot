// Reconcile a fresh MP subscription with the authenticated user.
//
// Lives at /api/mp-reconcile on Vercel.
//
// Why this exists: MP's back_url redirect is unreliable as a source of truth
// (the preapproval_id query param has been observed to get mangled by MP's
// own URL composer, and we can't force it to a specific shape). Rather than
// keep fighting URL parsing edge cases, this endpoint asks MP directly:
// "what subscription did the caller just create?"
//
// Flow:
//   1. Client POSTs here after returning from MP checkout.
//   2. We verify the JWT and resolve the user.
//   3. If the profile already has an active mp_preapproval_id, we just
//      re-sync state from MP (in case plan or dates changed) and return.
//   4. Otherwise we query MP for preapprovals authorized in the last 30
//      minutes, subtract anything already linked to another profile, and
//      pick the most recent remaining one. That's the one the user just
//      paid for.
//   5. Write mp_preapproval_id + plan + status + validity to profiles.
//
// Trade-off: if two different users subscribe within seconds of each other
// and neither has returned yet, there's a narrow race where user B could
// pick up user A's preapproval. We mitigate by: (a) excluding rows already
// linked in profiles, (b) only accepting subs created in the last 30 min.
// For our volume this is vanishingly unlikely; if it ever matters we'll
// switch to payer_id matching after the first link.

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
  payer_email?: string
  date_created?: string
  auto_recurring: {
    transaction_amount: number
    currency_id: string
    free_trial?: { frequency: number; frequency_type: string }
  }
  next_payment_date?: string
}

function planFromReason(reason: string): 'pro' | 'clinic' | null {
  const r = (reason ?? '').toLowerCase()
  if (r.includes('clinic')) return 'clinic'
  if (r.includes('pro')) return 'pro'
  return null
}

function planStatusFromMP(pre: MPPreapproval): string {
  if (pre.status === 'authorized') {
    return pre.auto_recurring.free_trial ? 'trialing' : 'active'
  }
  if (pre.status === 'paused') return 'past_due'
  if (pre.status === 'cancelled') return 'cancelled'
  return 'active'
}

async function syncFromPreapproval(userId: string, pre: MPPreapproval) {
  const plan = planFromReason(pre.reason) ?? 'pro'
  const planStatus = planStatusFromMP(pre)

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

  const { error } = await admin().from('profiles').update(update).eq('id', userId)
  if (error) throw error

  await admin().from('billing_events').insert({
    user_id: userId,
    event_type: `preapproval.${pre.status}`,
    mp_resource_id: pre.id,
    mp_resource_type: 'preapproval',
    amount: pre.auto_recurring.transaction_amount,
    currency: pre.auto_recurring.currency_id,
    status: pre.status,
    raw_payload: pre as unknown as Record<string, unknown>,
    source: 'reconcile',
  })

  return { plan, status: planStatus, validUntil: pre.next_payment_date ?? null }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

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

  // Check current profile state.
  const { data: profile } = await admin()
    .from('profiles')
    .select('mp_preapproval_id, plan, plan_status')
    .eq('id', userId!)
    .single()

  const currentPreId = profile?.mp_preapproval_id as string | null

  // Case A: profile is already linked — just resync from MP (idempotent).
  if (currentPreId) {
    const r = await fetch(`https://api.mercadopago.com/preapproval/${currentPreId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    })
    if (!r.ok) {
      console.warn('reconcile: linked preapproval fetch failed', r.status)
      return res.status(200).json({ ok: true, linked: false, note: 'already_linked_fetch_failed' })
    }
    const pre = (await r.json()) as MPPreapproval
    const out = await syncFromPreapproval(userId!, pre)
    return res.status(200).json({ ok: true, linked: 'resync', ...out })
  }

  // Case B: profile is not linked. Query MP for recent authorized subs, pick
  // the newest one that isn't claimed by another profile, and link it.
  const sinceMs = Date.now() - 30 * 60 * 1000 // 30 min window
  const sinceIso = new Date(sinceMs).toISOString()
  const searchUrl = new URL('https://api.mercadopago.com/preapproval/search')
  searchUrl.searchParams.set('status', 'authorized')
  searchUrl.searchParams.set('sort', 'date_created:desc')
  searchUrl.searchParams.set('limit', '20')

  const sr = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  })
  if (!sr.ok) {
    console.error('reconcile: MP search failed', sr.status, await sr.text())
    return res.status(502).json({ error: 'mp_search_failed' })
  }
  const { results } = (await sr.json()) as { results: MPPreapproval[] }

  const recent = (results ?? []).filter((p) => {
    if (p.status !== 'authorized') return false
    if (!p.date_created) return true
    return new Date(p.date_created).getTime() >= sinceMs
  })

  if (recent.length === 0) {
    return res.status(200).json({ ok: true, linked: false, note: 'no_recent_subscriptions' })
  }

  // Subtract ids already linked to some profile so we never steal someone
  // else's active sub.
  const ids = recent.map((p) => p.id)
  const { data: taken } = await admin()
    .from('profiles')
    .select('mp_preapproval_id')
    .in('mp_preapproval_id', ids)
  const takenSet = new Set((taken ?? []).map((r) => r.mp_preapproval_id as string))

  const claimable = recent.find((p) => !takenSet.has(p.id))
  if (!claimable) {
    return res
      .status(200)
      .json({ ok: true, linked: false, note: 'all_recent_already_linked' })
  }

  console.log(
    `reconcile: linking preapproval ${claimable.id} (created ${claimable.date_created}) to user ${userId}`,
  )
  const out = await syncFromPreapproval(userId!, claimable)
  return res
    .status(200)
    .json({ ok: true, linked: 'new', preapproval_id: claimable.id, since: sinceIso, ...out })
}
