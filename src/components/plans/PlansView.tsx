import { useEffect, useState } from 'react'
import { PLANS, TRIAL_DAYS, formatARS, type PlanId } from '../../lib/plans'
import {
  cancelSubscription,
  describeStatus,
  getBillingState,
  linkSubscription,
  startCheckout,
  type BillingState,
} from '../../lib/billing'
import Icon from '../Icon'
import Btn from '../Btn'

interface Props {
  currentPlan: PlanId
  userId: string
  onClose?: () => void
  onPlanChanged?: (plan: PlanId) => void
}

const PLAN_ORDER: PlanId[] = ['free', 'pro', 'clinic']

export default function PlansView({ currentPlan, userId, onClose }: Props) {
  const [saving, setSaving] = useState<PlanId | null>(null)
  const [state, setState] = useState<BillingState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      // If MP just redirected the user back with a preapproval_id, link it to
      // this account before loading billing state. MP appends it to back_url
      // on successful checkout. We do this client-side because the preapproval
      // API doesn't return payer_email, so the webhook can't match the sub
      // to the user on its own.
      const params = new URLSearchParams(window.location.search)
      const preId = params.get('preapproval_id')
      if (preId) {
        setLinking(true)
        try {
          await linkSubscription(preId)
        } catch (err) {
          if (alive) setError(err instanceof Error ? err.message : String(err))
        }
        // Strip the tracking params so a reload doesn't re-link.
        const url = new URL(window.location.href)
        url.searchParams.delete('preapproval_id')
        url.searchParams.delete('upgrade')
        window.history.replaceState({}, '', url.toString())
        if (alive) setLinking(false)
      }

      const s = await getBillingState(userId)
      if (alive) setState(s)
    })()
    return () => {
      alive = false
    }
  }, [userId])

  const handleChoose = async (planId: PlanId) => {
    if (planId === currentPlan) return
    setError(null)

    // Free: no checkout, just flip the plan locally. (We only allow this path
    // from an admin UI; for end users, downgrade happens via cancel.)
    if (planId === 'free') {
      setError('Para volver a Free cancelá tu plan actual desde el resumen.')
      return
    }

    try {
      setSaving(planId)
      await startCheckout(planId)
      // The tab navigates to MercadoPago; on success MP redirects back with
      // ?upgrade=success, at which point the user comes back to this view.
    } catch (err) {
      setSaving(null)
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleCancel = async () => {
    if (!confirm('¿Seguro que querés cancelar? Seguís con los beneficios hasta la próxima fecha de cobro.')) return
    setError(null)
    setCancelling(true)
    try {
      await cancelSubscription()
      const fresh = await getBillingState(userId)
      setState(fresh)
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
            className="w-9 h-9 rounded-full hover:bg-surface-2 grid place-items-center cursor-pointer text-text-hint"
          >
            <Icon name="x" size={14} />
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

        {/* Subscription status banner */}
        {state && state.plan !== 'free' && (
          <div className="max-w-[560px] mx-auto mb-10 bg-surface border border-gray-border rounded-[12px] px-5 py-4 flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-full grid place-items-center shrink-0 ${
                state.status === 'past_due'
                  ? 'bg-coral-light text-coral'
                  : state.status === 'cancelled'
                    ? 'bg-surface-2 text-text-hint'
                    : 'bg-teal-light text-teal'
              }`}
            >
              <Icon
                name={state.status === 'past_due' ? 'alert' : state.status === 'cancelled' ? 'x' : 'check'}
                size={14}
                stroke={2}
              />
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium text-text">
                {PLANS[state.plan].name} · {describeStatus(state)}
              </div>
              {(state.status === 'active' || state.status === 'trialing') && state.preapprovalId && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-[12px] text-text-hint mt-1.5 underline hover:text-coral disabled:opacity-60 cursor-pointer"
                >
                  {cancelling ? 'Cancelando…' : 'Cancelar suscripción'}
                </button>
              )}
              {state.status === 'past_due' && (
                <div className="text-[12px] text-text-muted mt-1 leading-[1.55]">
                  Tu última renovación fue rechazada. Actualizá el medio de pago desde tu cuenta de MercadoPago o
                  re-suscribite desde abajo.
                </div>
              )}
            </div>
          </div>
        )}

        {linking && (
          <div className="max-w-[560px] mx-auto mb-10 text-[13px] text-primary bg-primary-light rounded-[12px] px-4 py-3 flex items-center gap-2.5">
            <Icon name="check" size={14} stroke={2} />
            Confirmando tu suscripción con MercadoPago…
          </div>
        )}

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
                  disabled={isCurrent || saving === id || plan.price === 0}
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
                  {saving === id ? (
                    'Redirigiendo…'
                  ) : isCurrent ? (
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
    </div>
  )
}
