// MercadoPago webhook handler.
//
// MP sends notifications here whenever a subscription or a payment changes.
// We always re-read the resource from the MP API (never trust the payload
// blindly), then reconcile our `profiles.plan` state and append a row to
// `billing_events`.
//
// Expected env vars (Supabase Function secrets):
//   MP_ACCESS_TOKEN        — server-side access token of the MP app
//   MP_WEBHOOK_SECRET      — value of the "Secret key" configured in the MP
//                            webhook dashboard; used to verify x-signature
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY — used to bypass RLS from this function
//
// Deploy with: supabase functions deploy mp-webhook --no-verify-jwt

import { createClient } from "@supabase/supabase-js"

const MP_ACCESS_TOKEN = Deno.env.get("MP_ACCESS_TOKEN") ?? ""
const MP_WEBHOOK_SECRET = Deno.env.get("MP_WEBHOOK_SECRET") ?? ""
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// ────────────────────────────────────────────────────────────────
// Signature verification
//
// MP sends:
//   x-signature:  ts=1704067200,v1=abc123...
//   x-request-id: <uuid>
//
// The HMAC payload is:
//   id:{dataId};request-id:{requestId};ts:{ts};
// signed with MP_WEBHOOK_SECRET (sha256 hex).
// ────────────────────────────────────────────────────────────────

async function verifySignature(req: Request, dataId: string): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) {
    console.warn("MP_WEBHOOK_SECRET not set — skipping signature check (DEV only)")
    return true
  }
  const sigHeader = req.headers.get("x-signature") ?? ""
  const requestId = req.headers.get("x-request-id") ?? ""
  const parts = Object.fromEntries(
    sigHeader.split(",").map((kv) => kv.trim().split("=").map((s) => s.trim())),
  ) as { ts?: string; v1?: string }
  if (!parts.ts || !parts.v1) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(MP_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("")
  return hex === parts.v1
}

// ────────────────────────────────────────────────────────────────
// MP API fetchers
// ────────────────────────────────────────────────────────────────

async function mpGet<T>(path: string): Promise<T | null> {
  const r = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
  })
  if (!r.ok) {
    console.error(`MP GET ${path} → ${r.status}`, await r.text())
    return null
  }
  return (await r.json()) as T
}

interface MPPreapproval {
  id: string
  status: "pending" | "authorized" | "paused" | "cancelled"
  reason: string
  external_reference: string
  payer_id?: number
  payer_email?: string
  auto_recurring: {
    frequency: number
    frequency_type: "months" | "days"
    transaction_amount: number
    currency_id: string
    free_trial?: { frequency: number; frequency_type: string }
  }
  next_payment_date?: string
  date_created: string
  last_modified: string
}

interface MPPayment {
  id: number
  status: "approved" | "pending" | "rejected" | "refunded" | "in_process"
  status_detail: string
  transaction_amount: number
  currency_id: string
  external_reference?: string
  metadata?: { preapproval_id?: string }
  date_approved?: string
  date_created: string
  payer?: { id: number; email?: string }
}

// ────────────────────────────────────────────────────────────────
// Plan derivation
//
// Given the preapproval's reason (we set it to "MediBot Pro" / "MediBot Clinic")
// we figure out which plan to assign. This keeps us from maintaining a
// plan_id → reason mapping DB-side.
// ────────────────────────────────────────────────────────────────

function planFromReason(reason: string): "pro" | "clinic" | null {
  const r = reason.toLowerCase()
  if (r.includes("clinic")) return "clinic"
  if (r.includes("pro")) return "pro"
  return null
}

// ────────────────────────────────────────────────────────────────
// Handlers
// ────────────────────────────────────────────────────────────────

async function handlePreapproval(preapprovalId: string) {
  const pre = await mpGet<MPPreapproval>(`/preapproval/${preapprovalId}`)
  if (!pre) return

  // external_reference = our user_id (set at creation time)
  const userId = pre.external_reference
  if (!userId) {
    console.warn(`preapproval ${pre.id} has no external_reference — skipping`)
    return
  }

  const plan = planFromReason(pre.reason)
  const status = pre.status

  let planStatus: string
  let planId: string

  // Map MP status → our profile state.
  if (status === "authorized") {
    planStatus = pre.auto_recurring.free_trial ? "trialing" : "active"
    planId = plan ?? "free"
  } else if (status === "paused") {
    planStatus = "past_due"
    planId = plan ?? "free"
  } else if (status === "cancelled") {
    // Keep paid benefits until plan_valid_until elapses; a cron can then
    // demote. For now we mark cancelled; plan_id stays until valid_until.
    planStatus = "cancelled"
    planId = plan ?? "free"
  } else {
    planStatus = "active"
    planId = "free"
  }

  const update: Record<string, unknown> = {
    mp_preapproval_id: pre.id,
    mp_payer_id: pre.payer_id ? String(pre.payer_id) : null,
    plan: planId,
    plan_status: planStatus,
  }
  if (pre.next_payment_date) {
    update.plan_valid_until = pre.next_payment_date
  }

  const { error: upErr } = await admin.from("profiles").update(update).eq("id", userId)
  if (upErr) console.error("profile update failed", upErr)

  await admin.from("billing_events").insert({
    user_id: userId,
    event_type: `preapproval.${status}`,
    mp_resource_id: pre.id,
    mp_resource_type: "preapproval",
    amount: pre.auto_recurring.transaction_amount,
    currency: pre.auto_recurring.currency_id,
    status,
    raw_payload: pre as unknown as Record<string, unknown>,
    source: "webhook",
  })
}

async function handlePayment(paymentId: string) {
  const pay = await mpGet<MPPayment>(`/v1/payments/${paymentId}`)
  if (!pay) return

  // Find user: prefer external_reference, else look up by mp_preapproval_id
  let userId = pay.external_reference ?? null
  const preId = pay.metadata?.preapproval_id
  if (!userId && preId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("mp_preapproval_id", preId)
      .single()
    userId = data?.id ?? null
  }

  // For approved renewal payments, push plan_valid_until forward (MP renews
  // monthly — the next_payment_date is also updated on the preapproval, but
  // this keeps us consistent in case we only get the payment webhook first).
  if (pay.status === "approved" && userId) {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    await admin
      .from("profiles")
      .update({ plan_valid_until: nextMonth.toISOString(), plan_status: "active" })
      .eq("id", userId)
  } else if ((pay.status === "rejected" || pay.status === "refunded") && userId) {
    await admin.from("profiles").update({ plan_status: "past_due" }).eq("id", userId)
  }

  await admin.from("billing_events").insert({
    user_id: userId,
    event_type: `payment.${pay.status}`,
    mp_resource_id: String(pay.id),
    mp_resource_type: "payment",
    amount: pay.transaction_amount,
    currency: pay.currency_id,
    status: pay.status,
    raw_payload: pay as unknown as Record<string, unknown>,
    source: "webhook",
  })
}

// ────────────────────────────────────────────────────────────────
// Router
// ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  let body: { type?: string; action?: string; data?: { id?: string } } = {}
  try {
    body = await req.json()
  } catch {
    return new Response("bad json", { status: 400 })
  }

  const dataId = body.data?.id ? String(body.data.id) : ""
  if (!dataId) return new Response("no data.id", { status: 400 })

  const valid = await verifySignature(req, dataId)
  if (!valid) {
    console.warn("invalid MP signature", { topic: body.type, dataId })
    return new Response("invalid signature", { status: 401 })
  }

  const topic = body.type ?? body.action ?? ""

  try {
    if (topic.startsWith("subscription_preapproval") || topic === "preapproval") {
      await handlePreapproval(dataId)
    } else if (topic.startsWith("payment") || topic === "subscription_authorized_payment") {
      await handlePayment(dataId)
    } else {
      console.log("ignored topic", topic)
    }
  } catch (err) {
    console.error("handler error", err)
    // Still return 200 to avoid MP retry storms — the event is logged.
  }

  return new Response("ok", { status: 200 })
})
