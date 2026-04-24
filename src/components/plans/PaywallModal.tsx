import { PLANS, TRIAL_DAYS, formatARS, type PlanId } from '../../lib/plans'
import Icon from '../Icon'
import Btn from '../Btn'

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
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      <div
        className="bg-surface w-full sm:max-w-[440px] rounded-t-[20px] sm:rounded-[18px] overflow-hidden border border-gray-border shadow-[0_30px_80px_rgba(0,0,0,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sage hero */}
        <div className="bg-primary text-surface px-7 py-8 relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClose() }}
            aria-label="Cerrar"
            className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 grid place-items-center cursor-pointer text-surface z-10 transition-colors border border-white/10"
          >
            <Icon name="x" size={16} stroke={2.2} style={{ pointerEvents: 'none' }} />
          </button>
          <div
            className="text-[10px] uppercase tracking-[0.18em] opacity-75"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            función {requiredPlan === 'pro' ? 'pro' : 'clinic'}
          </div>
          <h2
            className="text-[26px] leading-[1.15] tracking-[-0.025em] font-normal m-0 mt-2"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {title}
          </h2>
          <p className="text-[13px] opacity-85 mt-3 leading-[1.55]">
            {description}
          </p>
        </div>

        {/* Plan card */}
        <div className="p-6">
          <div className="border border-gray-border rounded-[14px] p-5 mb-5 bg-surface-2">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div
                  className="text-[10px] text-text-hint uppercase tracking-[0.15em]"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Plan recomendado
                </div>
                <div
                  className="text-[22px] italic text-primary tracking-[-0.015em] mt-1"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {plan.name}
                </div>
              </div>
              <div className="text-right">
                <div
                  className="text-[28px] tracking-[-0.025em] leading-none text-text"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {formatARS(plan.price)}
                </div>
                <div
                  className="text-[10px] text-text-hint mt-1"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  ARS / mes · {TRIAL_DAYS} días gratis
                </div>
              </div>
            </div>
            <div className="text-[12px] text-text-muted mb-4 leading-[1.55]">{plan.description}</div>

            <div className="flex flex-col gap-2.5">
              {plan.features.slice(0, 5).map((f) => (
                <div key={f} className="flex gap-2 items-start text-[12.5px] leading-[1.5] text-text">
                  <Icon
                    name="check"
                    size={13}
                    stroke={2}
                    style={{ color: 'var(--color-teal)', marginTop: 2, flexShrink: 0 }}
                  />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>

          <Btn
            variant="primary"
            onClick={onSeeAllPlans}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
          >
            Ver todos los planes
          </Btn>
          <button
            onClick={onClose}
            className="w-full py-3 mt-2 text-[13px] font-medium cursor-pointer text-text hover:bg-surface-2 bg-transparent border border-gray-border rounded-[10px] transition-colors"
          >
            ← Volver a MediBot
          </button>
        </div>
      </div>
    </div>
  )
}
