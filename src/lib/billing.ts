// Billing client — MercadoPago Card Payment Brick flow.
//
// Flow:
//   1. User clicks "Probar 14 días" → CheckoutModal mounts MP's Card Payment
//      Brick, which collects card data and tokenizes it client-side. Card
//      data never touches our server.
//   2. The Brick's onSubmit gives us { token, payer.email }. We POST those
//      to /api/mp-create-subscription along with the planId + our Supabase JWT.
//   3. The server calls MP's POST /preapproval with card_token_id +
//      preapproval_plan_id + external_reference = user_id. MP returns the
//      authorized preapproval; we write the link into profiles in the same
//      request, then return the final plan state.
//   4. Every future webhook event for this sub carries external_reference,
//      so we match back to the user trivially.
//
// There is no redirect flow, no URL parsing, no reconciliation heuristics.

import { supabase } from './supabase'
import type { PlanId } from './plans'

const FN_URL = (name: string) => `/api/${name}`

// MP public key for the SDK (safe to expose — this is the client-side key
// from MP Dashboard → Credenciales de producción → Public Key).
export const MP_PUBLIC_KEY = (import.meta.env.VITE_MP_PUBLIC_KEY ?? '').trim()

export type PlanStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired'

export interface BillingState {
  plan: PlanId
  status: PlanStatus
  validUntil: string | null
  trialEndsAt: string | null
  preapprovalId: string | null
}

/**
 * Create a subscription with a card token obtained from MP's Card Payment
 * Brick. The server does the heavy lifting (POST /preapproval with our
 * external_reference) and returns the final plan state.
 */
export async function createSubscription(input: {
  planId: Exclude<PlanId, 'free'>
  cardToken: string
  payerEmail: string
}): Promise<{
  plan: PlanId
  status: PlanStatus
  validUntil: string | null
  preapprovalId: string
}> {
  const { data: sessionData } = await supabase.auth.getSession()
  const jwt = sessionData.session?.access_token
  if (!jwt) throw new Error('Necesitás iniciar sesión.')

  const res = await fetch(FN_URL('mp-create-subscription'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    let msg = 'No pudimos crear la suscripción.'
    try {
      const parsed = (await res.json()) as { message?: string; error?: string }
      msg = parsed.message || parsed.error || msg
    } catch {
      /* keep default */
    }
    throw new Error(msg)
  }

  return (await res.json()) as {
    plan: PlanId
    status: PlanStatus
    validUntil: string | null
    preapprovalId: string
  }
}

/**
 * Cancel the current subscription. Benefits remain until `plan_valid_until`,
 * after which a cron demotes the user to free.
 */
export async function cancelSubscription(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const jwt = sessionData.session?.access_token
  if (!jwt) throw new Error('Necesitás iniciar sesión.')

  const res = await fetch(FN_URL('mp-cancel-subscription'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('mp-cancel-subscription failed', res.status, body)
    throw new Error('No pudimos cancelar el plan. Contactanos y lo resolvemos.')
  }
}

// ────────────────────────────────────────────────────────────────
// Helpers for billing state displayed in the UI.
// ────────────────────────────────────────────────────────────────

export async function getBillingState(userId: string): Promise<BillingState | null> {
  const { data } = await supabase
    .from('profiles')
    .select('plan, plan_status, plan_valid_until, plan_trial_ends_at, mp_preapproval_id')
    .eq('id', userId)
    .single()
  if (!data) return null
  return {
    plan: (data.plan ?? 'free') as PlanId,
    status: (data.plan_status ?? 'active') as PlanStatus,
    validUntil: data.plan_valid_until,
    trialEndsAt: data.plan_trial_ends_at,
    preapprovalId: data.mp_preapproval_id,
  }
}

export function describeStatus(state: BillingState): string {
  if (state.plan === 'free') return 'Plan Free'
  const when = state.validUntil
    ? new Date(state.validUntil).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  switch (state.status) {
    case 'trialing':
      return when ? `Prueba gratis · termina el ${when}` : 'Prueba gratis'
    case 'active':
      return when ? `Activo · próximo cobro el ${when}` : 'Activo'
    case 'past_due':
      return 'Pago rechazado · actualizá el medio de pago'
    case 'cancelled':
      return when ? `Cancelado · seguís hasta el ${when}` : 'Cancelado'
    case 'expired':
      return 'Plan vencido'
    default:
      return 'Plan activo'
  }
}
