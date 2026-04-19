// Billing client — MercadoPago flow.
//
// The client hits our Supabase Edge Functions (`mp-create-subscription` and
// `mp-cancel-subscription`) which do the server-side work with the MP
// access token. MP then redirects the user through checkout and fires a
// webhook back to `mp-webhook` that reconciles our DB.

import { supabase } from './supabase'
import type { PlanId } from './plans'

// Billing endpoints run as Vercel serverless functions (co-located with the
// frontend). Keeping the prefix simple so everything is on the same origin —
// no CORS preflight, no Supabase gateway quirks.
const FN_URL = (name: string) => `/api/${name}`

/**
 * Start the upgrade flow for a plan. Redirects the browser to MercadoPago,
 * where the doctor authorizes the card. Returns (and never resolves) on
 * success; throws on error.
 */
export async function startCheckout(planId: Exclude<PlanId, 'free'>): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession()
  const jwt = sessionData.session?.access_token
  if (!jwt) throw new Error('Necesitás iniciar sesión.')

  const res = await fetch(FN_URL('mp-create-subscription'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ planId }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('mp-create-subscription failed', res.status, body)
    throw new Error('No pudimos iniciar el pago. Probá de nuevo en un minuto.')
  }

  const { init_point: initPoint } = (await res.json()) as { init_point: string }
  // Top-level redirect: MP's checkout does not work inside a modal iframe.
  window.location.href = initPoint
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

export type PlanStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired'

export interface BillingState {
  plan: PlanId
  status: PlanStatus
  validUntil: string | null
  trialEndsAt: string | null
  preapprovalId: string | null
}

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
