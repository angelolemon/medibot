import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PLANS, type PlanId } from '../../lib/plans'
import { billingWhatsappLink } from '../../lib/billing'
import Icon from '../Icon'
import Btn from '../Btn'

interface Props {
  currentPlan: PlanId
  userId: string
  onClose?: () => void
  onPlanChanged?: (plan: PlanId) => void
}

type BillingCycle = 'monthly' | 'yearly'

const PLAN_ORDER: PlanId[] = ['free', 'pro', 'clinic']

export default function PlansView({ currentPlan, userId, onClose, onPlanChanged }: Props) {
  const [saving, setSaving] = useState<PlanId | null>(null)
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const [doctorName, setDoctorName] = useState('')
  const [doctorEmail, setDoctorEmail] = useState('')
  const [contacted, setContacted] = useState<PlanId | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', userId)
        .single()
      if (alive && data) {
        setDoctorName(`${data.first_name ?? ''} ${data.last_name ?? ''}`.trim())
        setDoctorEmail(data.email ?? '')
      }
    })()
    return () => { alive = false }
  }, [userId])

  const handleChoose = async (planId: PlanId) => {
    if (planId === currentPlan) return

    const plan = PLANS[planId]

    // Free plan — no billing, apply directly.
    if (plan.price === 0) {
      setSaving(planId)
      const { error } = await supabase.from('profiles').update({ plan: planId }).eq('id', userId)
      setSaving(null)
      if (!error) {
        onPlanChanged?.(planId)
        if (onClose) onClose()
      } else {
        alert('Error al cambiar de plan: ' + error.message)
      }
      return
    }

    // Paid plans — manual billing via WhatsApp for now.
    const url = billingWhatsappLink({
      planName: plan.name,
      planPrice: plan.price,
      period: billing,
      doctorName,
      doctorEmail,
    })
    window.open(url, '_blank', 'noopener')
    setContacted(planId)
  }

  return (
    <div className="min-h-screen bg-bg overflow-y-auto" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
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
            Un precio justo,{' '}
            <span className="italic text-primary">sin sorpresas.</span>
          </h1>
          <p className="text-[15px] text-text-muted max-w-[560px] mx-auto leading-[1.6]">
            Empezás gratis con hasta 10 pacientes. Pagás solo cuando necesites más.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 mt-7 p-1 bg-surface border border-gray-border rounded-full">
            {(['monthly', 'yearly'] as const).map((b) => {
              const active = billing === b
              return (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  className={`px-4 py-[7px] rounded-full text-[12px] font-medium cursor-pointer transition-colors flex items-center gap-2 ${
                    active ? 'bg-primary text-surface' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {b === 'monthly' ? 'Mensual' : 'Anual'}
                  {b === 'yearly' && (
                    <span
                      className={`px-2 py-[1px] rounded-full text-[10px] font-semibold ${
                        active ? 'bg-white/20 text-surface' : 'bg-teal-light text-teal'
                      }`}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    >
                      -20%
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Billing flow notice */}
        {contacted && (
          <div className="max-w-[560px] mx-auto mb-10 bg-teal-light border border-teal/20 rounded-[12px] px-5 py-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal text-surface grid place-items-center shrink-0">
              <Icon name="check" size={14} stroke={2} />
            </div>
            <div>
              <div className="text-[13px] font-medium text-teal">Te escribimos por WhatsApp.</div>
              <div className="text-[12px] text-text-muted mt-1 leading-[1.55]">
                Te respondemos en menos de 24hs con el medio de pago. Mientras tanto podés seguir usando tu plan actual.
              </div>
            </div>
          </div>
        )}

        {/* Plan grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-14 items-stretch">
          {PLAN_ORDER.map((id) => {
            const plan = PLANS[id]
            const isCurrent = currentPlan === id
            const isHighlighted = !!plan.highlighted
            const monthlyPrice = plan.price
            const displayedPrice =
              billing === 'yearly' ? Math.round(monthlyPrice * 0.8) : monthlyPrice

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
                  <div className={`text-[12px] mt-1 ${isHighlighted ? 'text-surface opacity-75' : 'text-text-muted'}`}>
                    {plan.description}
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 mb-5">
                  <div
                    className="text-[42px] md:text-[46px] font-normal tracking-[-0.03em] leading-[1]"
                    style={{ fontFamily: 'var(--font-serif)' }}
                  >
                    {monthlyPrice === 0 ? 'Gratis' : `$${displayedPrice}`}
                  </div>
                  {monthlyPrice > 0 && (
                    <div className={`text-[13px] ${isHighlighted ? 'text-surface opacity-70' : 'text-text-hint'}`}>
                      USD / mes
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleChoose(id)}
                  disabled={isCurrent || saving === id}
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
                    'Cambiando…'
                  ) : isCurrent ? (
                    'Plan actual'
                  ) : monthlyPrice === 0 ? (
                    'Usar gratis'
                  ) : contacted === id ? (
                    <>
                      <Icon name="check" size={13} /> Te escribimos
                    </>
                  ) : (
                    <>
                      <Icon name="chat" size={13} /> Contratar por WhatsApp
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
              ['¿Qué pasa si cancelo?', 'No hay cargo — mantenés acceso hasta el fin del ciclo.'],
              ['¿Pueden migrar mis pacientes actuales?', 'Sí. Importamos tu planilla de Excel en minutos.'],
              ['¿Los datos están seguros?', 'Servidores en Argentina, cifrado de extremo a extremo, HIPAA-compliant.'],
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
              <Btn variant="primary"><Icon name="chat" size={13} /> Agendar demo</Btn>
              <Btn>Escribinos</Btn>
            </div>
          </div>
        </div>

        <div
          className="text-center text-[11px] text-text-hint uppercase tracking-[0.18em]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          precios en USD · coordinamos pago por WhatsApp · factura B AR o invoice USA
        </div>
      </div>
    </div>
  )
}
