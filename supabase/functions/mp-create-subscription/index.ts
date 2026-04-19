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

  // For "Suscripciones con plan asociado" we don't POST /preapproval (that
  // endpoint requires a tokenized card). Instead we redirect to MP's hosted
  // subscription checkout. After the user authorizes their card, MP creates
  // the preapproval on our behalf — with our `external_reference` preserved —
  // and fires the `subscription_preapproval` webhook that our mp-webhook
  // function reconciles.
  //
  // The init_point format is documented under "Suscripciones con plan asociado":
  //   https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id={id}
  const initPoint = new URL("https://www.mercadopago.com.ar/subscriptions/checkout")
  initPoint.searchParams.set("preapproval_plan_id", mpPlanId)
  initPoint.searchParams.set("external_reference", user.id)

  // Log intent so we can trace issues even if the user bails from checkout.
  await admin.from("billing_events").insert({
    user_id: user.id,
    event_type: "preapproval.requested",
    mp_resource_id: mpPlanId,
    mp_resource_type: "preapproval_plan",
    status: "pending",
    source: "api",
  })

  return json({ init_point: initPoint.toString() }, 200)
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  })
}
