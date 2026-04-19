// Cancel the authenticated doctor's MP subscription (keeps benefits until
// plan_valid_until; a cron demotes to free after that).
//
// Lives at /api/mp-cancel-subscription on Vercel.

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

  const { data: profile } = await admin()
    .from('profiles')
    .select('mp_preapproval_id')
    .eq('id', userId!)
    .single()
  const preId = profile?.mp_preapproval_id as string | null
  if (!preId) return res.status(400).json({ error: 'no_active_subscription' })

  const r = await fetch(`https://api.mercadopago.com/preapproval/${preId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: 'cancelled' }),
  })

  if (!r.ok) {
    const text = await r.text()
    // Idempotent: if MP says the preapproval is already cancelled, treat
    // that as success and reconcile our DB. This happens when the user
    // double-clicks or retries after a network blip.
    const alreadyCancelled =
      r.status === 400 &&
      /already|cancelled|cannot modify/i.test(text)
    if (!alreadyCancelled) {
      console.error('MP cancel failed', r.status, text)
      return res.status(500).json({ error: 'mp_error', detail: text.slice(0, 300) })
    }
    console.log('MP reported already cancelled; reconciling DB')
  }

  await admin().from('profiles').update({ plan_status: 'cancelled' }).eq('id', userId!)
  await admin().from('billing_events').insert({
    user_id: userId,
    event_type: 'preapproval.cancelled',
    mp_resource_id: preId,
    mp_resource_type: 'preapproval',
    status: 'cancelled',
    source: 'api',
  })

  return res.status(200).json({ ok: true, status: 'cancelled' })
}
