import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PLANS, type PlanId } from '../../lib/plans'

interface Props {
  currentPlan: PlanId
  userId: string
  onClose?: () => void
  onPlanChanged?: (plan: PlanId) => void
}

export default function PlansView({ currentPlan, userId, onClose, onPlanChanged }: Props) {
  const [saving, setSaving] = useState<PlanId | null>(null)

  const handleChoose = async (planId: PlanId) => {
    if (planId === currentPlan) return
    setSaving(planId)

    // Simulated upgrade: just update the DB. Real flow would integrate with Stripe/MercadoPago.
    const { error } = await supabase
      .from('profiles')
      .update({ plan: planId })
      .eq('id', userId)

    setSaving(null)
    if (!error) {
      onPlanChanged?.(planId)
      if (onClose) onClose()
    } else {
      alert('Error al cambiar de plan: ' + error.message)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="bg-white border-b border-gray-border px-6 py-4 shrink-0 flex items-center justify-between">
        <div>
          <div className="text-[17px] font-semibold">Planes y precios</div>
          <div className="text-sm text-text-muted mt-0.5">Elegí el plan que mejor se adapte a tu práctica</div>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-text-hint hover:bg-gray-bg cursor-pointer">
            ✕
          </button>
        )}
      </div>

      <div className="p-4 sm:p-6 overflow-y-auto flex-1 pb-20 lg:pb-10 bg-gray-bg">
        {/* Demo notice */}
        <div className="max-w-4xl mx-auto mb-6 bg-amber-light/50 border border-amber/20 rounded-lg px-4 py-3 text-xs text-amber">
          <strong>Modo demo:</strong> el cambio de plan se aplica al instante, sin cobro real. En producción se integrará con MercadoPago o Stripe.
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['free', 'pro', 'clinic'] as PlanId[]).map((id) => {
            const plan = PLANS[id]
            const isCurrent = currentPlan === id
            const isHighlighted = plan.highlighted

            return (
              <div
                key={id}
                className={`bg-white border rounded-[14px] p-6 flex flex-col transition-all relative ${
                  isCurrent ? 'border-teal shadow-md' :
                  isHighlighted ? 'border-primary shadow-md' :
                  'border-gray-border'
                }`}
              >
                {isHighlighted && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full">
                    Más popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal text-white text-[10px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full">
                    Plan actual
                  </div>
                )}

                <div className="mb-4">
                  <div className="text-[15px] font-semibold">{plan.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">{plan.description}</div>
                </div>

                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-semibold">${plan.price}</span>
                    <span className="text-xs text-text-hint">USD / mes</span>
                  </div>
                  {plan.price === 0 && (
                    <div className="text-[10px] text-teal font-medium mt-0.5">Gratis siempre</div>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-text">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-teal shrink-0 mt-0.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleChoose(id)}
                  disabled={isCurrent || saving === id}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors disabled:cursor-not-allowed ${
                    isCurrent
                      ? 'bg-gray-bg text-text-hint border border-gray-border'
                      : isHighlighted
                        ? 'bg-primary text-white border border-primary hover:bg-[#534AB7]'
                        : 'bg-white text-primary border border-primary hover:bg-primary-light'
                  }`}
                >
                  {saving === id ? 'Cambiando...' : isCurrent ? 'Plan actual' : plan.price === 0 ? 'Usar gratis' : `Elegir ${plan.name}`}
                </button>
              </div>
            )
          })}
        </div>

        <div className="max-w-4xl mx-auto mt-8 text-center text-xs text-text-hint">
          Podés cambiar o cancelar tu plan en cualquier momento.
        </div>
      </div>
    </div>
  )
}
