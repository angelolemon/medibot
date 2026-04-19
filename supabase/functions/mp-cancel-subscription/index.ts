// Cancels the authenticated doctor's MP subscription. They keep the paid
// benefits until `plan_valid_until` elapses; after that a downgrade job
// turns them back into `free`.
//
// Input: no body (the user is derived from the JWT).
// Output: { ok: true, status: 'cancelled' }
//
// Env vars: MP_ACCESS_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js"

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors })

  const authHeader = req.headers.get("Authorization") ?? ""
  const jwt = authHeader.replace("Bearer ", "")
  if (!jwt) return json({ error: "missing_auth" }, 401)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: "invalid_auth" }, 401)

  const user = userData.user

  const { data: profile } = await admin
    .from("profiles")
    .select("mp_preapproval_id")
    .eq("id", user.id)
    .single()

  const preId = profile?.mp_preapproval_id
  if (!preId) return json({ error: "no_active_subscription" }, 400)

  // PUT /preapproval/{id} with status=cancelled tells MP to stop future charges.
  const r = await fetch(`https://api.mercadopago.com/preapproval/${preId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  })
  if (!r.ok) {
    const text = await r.text()
    console.error("MP cancel failed", r.status, text)
    return json({ error: "mp_error", detail: text.slice(0, 300) }, 500)
  }

  await admin.from("profiles").update({ plan_status: "cancelled" }).eq("id", user.id)
  await admin.from("billing_events").insert({
    user_id: user.id,
    event_type: "preapproval.cancelled",
    mp_resource_id: preId,
    mp_resource_type: "preapproval",
    status: "cancelled",
    source: "api",
  })

  return json({ ok: true, status: "cancelled" }, 200)
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}
