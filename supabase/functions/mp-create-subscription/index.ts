// Creates a MercadoPago Preapproval for the currently authenticated doctor
// and returns its `init_point` (the URL we redirect to for card authorization).
//
// The web client calls this when the user hits "Upgrade to Pro/Clinic".
//
// Input (JSON body):
//   { planId: 'pro' | 'clinic' }
//
// Output:
//   { init_point: string, preapproval_id: string }
//
// Env vars:
//   MP_ACCESS_TOKEN
//   MP_PLAN_ID_PRO          — the preapproval_plan id you created in MP dashboard
//   MP_PLAN_ID_CLINIC       — same for Clinic
//   PUBLIC_SITE_URL         — used for back_url (where MP redirects after auth)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { createClient } from "@supabase/supabase-js"

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN") ?? ""
const MP_PLAN_ID_PRO = Deno.env.get("MP_PLAN_ID_PRO") ?? ""
const MP_PLAN_ID_CLINIC = Deno.env.get("MP_PLAN_ID_CLINIC") ?? ""
const PUBLIC_SITE_URL = (Deno.env.get("PUBLIC_SITE_URL") ?? "https://panel-medico-pied.vercel.app").replace(/\/$/, "")
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

  // Auth: read the JWT from the request, resolve the user via Supabase.
  const authHeader = req.headers.get("Authorization") ?? ""
  const jwt = authHeader.replace("Bearer ", "")
  if (!jwt) return json({ error: "missing_auth" }, 401)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt)
  if (userErr || !userData?.user) return json({ error: "invalid_auth" }, 401)

  const user = userData.user

  let body: { planId?: string } = {}
  try {
    body = await req.json()
  } catch {
    return json({ error: "bad_json" }, 400)
  }

  const planId = body.planId
  if (planId !== "pro" && planId !== "clinic") {
    return json({ error: "invalid_plan" }, 400)
  }

  const mpPlanId = planId === "clinic" ? MP_PLAN_ID_CLINIC : MP_PLAN_ID_PRO
  if (!mpPlanId) return json({ error: "plan_not_configured" }, 500)

  // Look up the doctor's email for the payer_email field.
  const { data: profile } = await admin
    .from("profiles")
    .select("email, first_name, last_name")
    .eq("id", user.id)
    .single()
  const payerEmail = profile?.email ?? user.email ?? ""

  // Create the preapproval linked to the plan.
  const mpRes = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      preapproval_plan_id: mpPlanId,
      reason: `MediBot ${planId === "clinic" ? "Clinic" : "Pro"}`,
      external_reference: user.id,
      payer_email: payerEmail,
      back_url: `${PUBLIC_SITE_URL}/planes?upgrade=success`,
      status: "pending",
    }),
  })

  if (!mpRes.ok) {
    const errText = await mpRes.text()
    console.error("MP preapproval create failed", mpRes.status, errText)
    return json({ error: "mp_error", detail: errText.slice(0, 300) }, 500)
  }

  const pre = (await mpRes.json()) as { id: string; init_point: string }

  // Persist the preapproval id preemptively so a webhook that fires before the
  // redirect has a user to reconcile against.
  await admin
    .from("profiles")
    .update({
      mp_preapproval_id: pre.id,
      plan_status: "trialing", // will be confirmed by webhook
    })
    .eq("id", user.id)

  await admin.from("billing_events").insert({
    user_id: user.id,
    event_type: "preapproval.requested",
    mp_resource_id: pre.id,
    mp_resource_type: "preapproval",
    status: "pending",
    source: "api",
  })

  return json({ init_point: pre.init_point, preapproval_id: pre.id }, 200)
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}
