import { useEffect, useState } from 'react'
import { PLANS, TRIAL_DAYS, formatARS, type PlanId } from '../../lib/plans'
import {
  MP_PUBLIC_KEY,
  cancelSubscription,
  describeStatus,
  getBillingState,
  type BillingState,
} from '../../lib/billing'
import { supabase } from '../../lib/supabase'
import Icon from '../Icon'
import Btn from '../Btn'
import CheckoutModal from './CheckoutModal'

interface Props {
  currentPlan: PlanId
  userId: string
  onClose?: () => void
  onPlanChanged?: (plan: PlanId) => void
}

const PLAN_ORDER: PlanId[] = ['free', 'pro', 'clinic']

export default function PlansView({ currentPlan, userId, onClose, onPlanChanged }: Props) {
  const [state, setState] = useState<BillingState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState<Exclude<PlanId, 'free'> | null>(null)
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      const [{ data: userData }, s] = await Promise.all([
        supabase.auth.getUser(),
        getBillingState(userId),
      ])
      if (!alive) return
      setEmail(userData.user?.email ?? '')
      setState(s)
    })()
    return () => {
      alive = false
    }
  }, [userId])

  const refreshState = async () => {
    const s = await getBillingState(userId)
    setState(s)
  }

  const handleChoose = (planId: PlanId) => {
    if (planId === currentPlan) return
    setError(null)

    if (planId === 'free') {
      setError('Para volver a Free cancelá tu plan actual desde el resumen.')
      return
    }
    if (!MP_PUBLIC_KEY) {
      setError('MercadoPago no está configurado (falta VITE_MP_PUBLIC_KEY). Contactá al equipo.')
      return
    }

    setCheckoutPlan(planId as Exclude<PlanId, 'free'>)
  }

  const handleCancel = async () => {
    if (
      !confirm(
        '¿Seguro que querés cancelar? Seguís con los beneficios hasta la próxima fecha de cobro.',
      )
    )
      return
    setError(null)
    setCancelling(true)
    try {
      await cancelSubscription()
      await refreshState()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div
      className="min-h-screen bg-bg overflow-y-auto"
      style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}
    >
      {/* Top bar */}
      <div className="bg-surface border-b border-gray-border px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div
            className="text-[20px] italic text-primary"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            MediBot
          </div>
          <span
            className="px-2.5 py-[3px] rounded-full text-[10px] font-semibold bg-amber-light text-amber uppercase tracking-[0.12em] whitespace-nowrap"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            Plan actual · {PLANS[currentPlan].name}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="h-9 px-3.5 rounded-[10px] border border-gray-border-2 bg-surface hover:bg-surface-2 text-[13px] font-medium text-text cursor-pointer inline-flex items-center gap-1.5 transition-colors"
          >
            <Icon name="chevL" size={14} stroke={2} />
            Volver a MediBot
          </button>
        )}
      </div>

      <div className="max-w-[1120px] mx-auto px-6 md:px-10 py-14 pb-20">
        {/* Hero */}
        <div className="text-center mb-12">
          <div
            className="text-[10px] text-text-hint uppercase tracking-[0.18em]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            elegí tu plan
          </div>
          <h1
            className="text-[40px] md:text-[56px] font-normal tracking-[-0.035em] leading-[1] mt-3.5 mb-4"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Un precio justo, <span className="italic text-primary">sin sorpresas.</span>
          </h1>
          <p className="text-[15px] text-text-muted max-w-[560px] mx-auto leading-[1.6]">
            Empezás gratis con hasta 10 pacientes. Probás Pro {TRIAL_DAYS} días sin cargo — cancelás cuando quieras.
          </p>
        </div>

        {/* Subscription status banner.
            Two-line layout: plan name + status pill on top, detail copy under.
            Icons per status are informational (clock for wind-down, alert for
            failed payment, check for healthy) — never a × that reads as a
            close button. */}
        {state && state.plan !== 'free' && (() => {
          const validUntilStr = state.validUntil
            ? new Date(state.validUntil).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })
            : null

          const statusStyles = {
            trialing: {
              icon: 'check' as const,
              wrap: 'bg-teal-light text-teal',
              pillBg: 'bg-teal-light',
              pillText: 'text-teal',
              pillLabel: 'Prueba gratis',
            },
            active: {
              icon: 'check' as const,
              wrap: 'bg-teal-light text-teal',
              pillBg: 'bg-teal-light',
              pillText: 'text-teal',
              pillLabel: 'Activo',
            },
            cancelled: {
              icon: 'clock' as const,
              wrap: 'bg-amber-light text-amber',
              pillBg: 'bg-amber-light',
              pillText: 'text-amber',
              pillLabel: 'Cancelado',
            },
            past_due: {
              icon: 'alert' as const,
              wrap: 'bg-coral-light text-coral',
              pillBg: 'bg-coral-light',
              pillText: 'text-coral',
              pillLabel: 'Pago rechazado',
            },
            expired: {
              icon: 'clock' as const,
              wrap: 'bg-surface-2 text-text-hint',
              pillBg: 'bg-surface-2',
              pillText: 'text-text-hint',
              pillLabel: 'Vencido',
            },
          }[state.status]

          const detail =
            state.status === 'trialing'
              ? validUntilStr && `Tu prueba gratis termina el ${validUntilStr}. Ahí empieza el cobro mensual.`
              : state.status === 'active'
                ? validUntilStr && `Próximo cobro el ${validUntilStr}. Cancelás cuando quieras.`
                : state.status === 'cancelled'
                  ? validUntilStr && `Seguís con los beneficios hasta el ${validUntilStr}. Después volvés a Free automáticamente.`
                  : state.status === 'past_due'
                    ? 'Tu última renovación fue rechazada. Actualizá el medio de pago desde MercadoPago o re-suscribite abajo.'
                    : null

          return (
            <div className="max-w-[560px] mx-auto mb-10 bg-surface border border-gray-border rounded-[14px] p-5">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${statusStyles.wrap}`}
                >
                  <Icon name={statusStyles.icon} size={15} stroke={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-medium text-text">Plan {PLANS[state.plan].name}</span>
                    <span
                      className={`px-2 py-[2px] rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] whitespace-nowrap ${statusStyles.pillBg} ${statusStyles.pillText}`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      {statusStyles.pillLabel}
                    </span>
                  </div>
                  {detail && (
                    <div className="text-[12.5px] text-text-muted mt-1.5 leading-[1.55]">
                      {detail}
                    </div>
                  )}
                  {(state.status === 'active' || state.status === 'trialing') && state.preapprovalId && (
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="text-[12px] text-text-hint mt-2.5 underline hover:text-coral disabled:opacity-60 cursor-pointer bg-transparent border-none p-0"
                    >
                      {cancelling ? 'Cancelando…' : 'Cancelar suscripción'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {error && (
          <div className="max-w-[560px] mx-auto mb-10 text-[13px] text-coral bg-coral-light rounded-[12px] px-4 py-3">
            {error}
          </div>
        )}

        {/* Plan grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14 items-stretch">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id]
            const isCurrent = currentPlan === id
            const isHighlighted = !!plan.highlighted

            return (
              <div
                key={id}
                className={`relative rounded-[18px] p-7 flex flex-col border ${
                  isHighlighted
                    ? 'bg-primary text-surface border-primary shadow-[0_20px_40px_-20px_rgba(59,74,56,0.35)]'
                    : 'bg-surface text-text border-gray-border'
                }`}
              >
                {isHighlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.15em] bg-teal text-surface whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    Recomendado
                  </div>
                )}
                {isCurrent && !isHighlighted && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.15em] bg-teal text-surface whitespace-nowrap"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    Plan actual
                  </div>
                )}

                <div className="mb-5">
                  <div
                    className={`text-[22px] italic tracking-[-0.015em] ${
                      isHighlighted ? 'text-surface' : 'text-primary'
                    }`}
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {plan.name}
                  </div>
                  <div
                    className={`text-[12px] mt-1 ${
                      isHighlighted ? 'text-surface opacity-75' : 'text-text-muted'
                    }`}
                  >
                    {plan.description}
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 mb-5">
                  <div
                    className="text-[42px] md:text-[46px] font-normal tracking-[-0.03em] leading-[1]"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {plan.price === 0 ? 'Gratis' : formatARS(plan.price)}
                  </div>
                  {plan.price > 0 && (
                    <div
                      className={`text-[13px] ${
                        isHighlighted ? 'text-surface opacity-70' : 'text-text-hint'
                      }`}
                    >
                      ARS / mes
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleChoose(id)}
                  disabled={isCurrent || plan.price === 0}
                  className={`w-full py-[11px] rounded-[10px] text-[13px] font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-colors mb-5 inline-flex items-center justify-center gap-2 ${
                    isCurrent
                      ? isHighlighted
                        ? 'bg-white/15 text-surface border border-white/20'
                        : 'bg-surface-2 text-text-hint border border-gray-border'
                      : isHighlighted
                        ? 'bg-surface text-primary hover:bg-surface-2'
                        : 'bg-primary text-surface hover:bg-[#2F3C2D]'
                  }`}
                >
                  {isCurrent ? (
                    'Plan actual'
                  ) : plan.price === 0 ? (
                    'Se activa al cancelar'
                  ) : (
                    <>
                      {plan.price > 0 && state?.status === 'past_due' ? 'Reactivar' : `Probar ${TRIAL_DAYS} días`}
                      <span className="opacity-70">→</span>
                    </>
                  )}
                </button>

                <div
                  className={`flex-1 flex flex-col gap-2.5 pt-5 border-t ${
                    isHighlighted ? 'border-white/20' : 'border-gray-border'
                  }`}
                >
                  {plan.features.map((f) => (
                    <div key={f} className="flex gap-2.5 items-start text-[12.5px] leading-[1.5]">
                      <Icon
                        name="check"
                        size={14}
                        stroke={2}
                        style={{
                          color: isHighlighted ? 'var(--color-surface)' : 'var(--color-teal)',
                          opacity: isHighlighted ? 0.9 : 1,
                          marginTop: 2,
                          flexShrink: 0,
                        }}
                      />
                      <span className={isHighlighted ? 'opacity-95' : ''}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* FAQ + Enterprise CTA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
          <div className="p-7 bg-surface border border-gray-border rounded-[14px]">
            <div
              className="text-[10px] text-text-hint uppercase tracking-[0.15em]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ¿Dudas?
            </div>
            <h3
              className="text-[22px] tracking-[-0.018em] font-normal mt-2.5 mb-3"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Las más frecuentes.
            </h3>
            {[
              ['¿Cuándo se hace el primer cobro?', `Después de los ${TRIAL_DAYS} días de prueba gratis. Cancelás antes sin cargo.`],
              ['¿Qué pasa si cancelo?', 'Mantenés acceso hasta la próxima fecha de cobro. Después volvés automáticamente a Free.'],
              ['¿Con qué tarjeta puedo pagar?', 'MercadoPago acepta Visa, Mastercard y Amex — crédito y débito.'],
              ['¿Pueden migrar mis pacientes actuales?', 'Sí. Importamos tu planilla de Excel en minutos.'],
            ].map(([q, a]) => (
              <div key={q} className="py-3 border-t border-gray-border">
                <div className="text-[13px] font-medium text-text">{q}</div>
                <div className="text-[12px] text-text-muted mt-1 leading-[1.55]">{a}</div>
              </div>
            ))}
          </div>

          <div className="p-7 bg-primary-light border border-primary-mid rounded-[14px] flex flex-col justify-between">
            <div>
              <div
                className="text-[10px] text-primary uppercase tracking-[0.15em]"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                ¿Sos un equipo grande?
              </div>
              <h3
                className="text-[24px] tracking-[-0.025em] font-normal mt-3 mb-3 text-primary"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                Hablemos de un plan a medida.
              </h3>
              <p className="text-[13px] text-text-muted leading-[1.6]">
                Más de 10 profesionales, integraciones con sistemas propios, contratos anuales. Coordinamos una demo.
              </p>
            </div>
            <div className="flex gap-2 mt-5">
              <Btn variant="primary">
                <Icon name="chat" size={13} /> Agendar demo
              </Btn>
              <Btn>Escribinos</Btn>
            </div>
          </div>
        </div>

        <div
          className="text-center text-[11px] text-text-hint uppercase tracking-[0.18em]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          cobro automático vía MercadoPago · factura al email · cancelás cuando quieras
        </div>
      </div>

      {checkoutPlan && email && (
        <CheckoutModal
          planId={checkoutPlan}
          publicKey={MP_PUBLIC_KEY}
          payerEmail={email}
          onSuccess={async () => {
            const newPlan = checkoutPlan
            setCheckoutPlan(null)
            await refreshState()
            // Notify the parent so the rest of the app (sidebar badge, gated
            // features, whatever else keys off currentPlan) picks up the new
            // plan without a manual page reload.
            onPlanChanged?.(newPlan)
          }}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
    </div>
  )
}
