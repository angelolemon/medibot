import { PLANS, type PlanId } from '../../lib/plans'

interface Props {
  title: string
  description: string
  requiredPlan: 'pro' | 'clinic'
  currentPlan?: PlanId
  onClose: () => void
  onSeeAllPlans: () => void
}

export default function PaywallModal({ title, description, requiredPlan, onClose, onSeeAllPlans }: Props) {
  const plan = PLANS[requiredPlan]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-[20px] sm:rounded-[14px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-primary to-[#534AB7] px-6 py-8 text-white text-center">
          <div className="text-3xl mb-2">✨</div>
          <div className="text-[18px] font-semibold mb-1">{title}</div>
          <div className="text-xs opacity-90">{description}</div>
        </div>

        {/* Plan card */}
        <div className="p-6">
          <div className="border-2 border-primary rounded-[14px] p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[11px] text-text-hint uppercase tracking-wide">Plan recomendado</div>
                <div className="text-[18px] font-semibold">{plan.name}</div>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-semibold">${plan.price}</div>
                <div className="text-[10px] text-text-hint">USD / mes</div>
              </div>
            </div>
            <div className="text-xs text-text-muted mb-4">{plan.description}</div>

            <ul className="space-y-2">
              {plan.features.slice(0, 5).map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-text">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-teal shrink-0 mt-0.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onSeeAllPlans}
              className="w-full py-3 rounded-lg text-sm font-medium cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors"
            >
              Ver todos los planes
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-lg text-sm cursor-pointer text-text-muted hover:text-text"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
