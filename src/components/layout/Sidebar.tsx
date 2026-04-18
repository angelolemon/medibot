import { useState, useRef, useEffect } from 'react'
import type { Organization } from '../../lib/hooks'
import { canUseBot, type PlanId } from '../../lib/plans'
import Icon from '../Icon'

export type View = 'agenda' | 'pacientes' | 'bloqueos' | 'estadisticas' | 'config' | 'perfil' | 'organizacion'

const navItems: { icon: string; label: string; view: View }[] = [
  { icon: 'calendar', label: 'Agenda', view: 'agenda' },
  { icon: 'users',    label: 'Pacientes', view: 'pacientes' },
  { icon: 'block',    label: 'Bloqueos', view: 'bloqueos' },
  { icon: 'chart',    label: 'Estadísticas', view: 'estadisticas' },
  { icon: 'chat',     label: 'WhatsApp Bot', view: 'config' },
]

interface Props {
  activeView: View
  onNavigate: (view: View) => void
  agendaBadge?: number
  onLogout?: () => void
  doctorName?: string
  doctorSub?: string
  organizations: Organization[]
  currentOrg: Organization | null
  isOrgAdmin: boolean
  onSwitchOrg: (org: Organization | null) => void
  onCreateOrg: () => void
  currentPlan?: PlanId
}

export default function Sidebar({ activeView, onNavigate, agendaBadge, onLogout, doctorName, doctorSub, organizations, currentOrg, isOrgAdmin, onSwitchOrg, onCreateOrg, currentPlan }: Props) {
  const showBotLock = currentPlan ? !canUseBot(currentPlan) : false
  const [orgOpen, setOrgOpen] = useState(false)
  const orgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) setOrgOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isOrg = !!currentOrg
  const displayName = isOrg ? currentOrg.name : (doctorName || 'MediBot')
  const displaySub = isOrg ? (isOrgAdmin ? 'Admin' : 'Miembro') : (doctorSub || 'Personal')
  const initials = isOrg
    ? currentOrg.name[0].toUpperCase()
    : doctorName ? doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'MB'
  const hasLogo = isOrg && currentOrg.logo_url

  const bottomTabView: View = isOrg ? 'organizacion' : 'perfil'
  const bottomTabLabel = isOrg ? 'Organización' : 'Mi perfil'
  const bottomTabIcon = isOrg ? 'building' : 'user'

  return (
    <aside className="hidden lg:flex w-[220px] bg-surface border-r border-gray-border flex-col shrink-0 h-screen">
      {/* Profile/Org switcher */}
      <div className="px-3.5 py-3.5 border-b border-gray-border relative" ref={orgRef}>
        <div
          onClick={() => setOrgOpen(!orgOpen)}
          className="flex items-center gap-2.5 px-1.5 py-1 rounded-lg cursor-pointer hover:bg-surface-2 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-primary text-surface grid place-items-center text-[13px] font-serif shrink-0 overflow-hidden"
            style={{ fontFamily: 'var(--font-serif)' }}>
            {hasLogo ? (
              <img src={currentOrg.logo_url!} alt="" className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-text truncate">{displayName}</div>
            <div className="text-[10px] text-text-hint truncate">{displaySub}</div>
          </div>
          <Icon name="chevD" size={14} style={{ color: 'var(--color-text-hint)' }} />
        </div>

        {orgOpen && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-surface border border-gray-border rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.08)] z-50 py-1 overflow-hidden">
            <button
              onClick={() => { onSwitchOrg(null); setOrgOpen(false) }}
              className={`w-full px-3 py-2 text-[12px] text-left cursor-pointer hover:bg-surface-2 transition-colors flex items-center gap-2 ${
                !currentOrg ? 'bg-primary-light text-primary font-medium' : 'text-text'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-surface-2 grid place-items-center text-[9px] font-serif text-text-hint"
                style={{ fontFamily: 'var(--font-serif)' }}>P</span>
              Personal
            </button>

            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => { onSwitchOrg(org); setOrgOpen(false) }}
                className={`w-full px-3 py-2 text-[12px] text-left cursor-pointer hover:bg-surface-2 transition-colors flex items-center gap-2 ${
                  currentOrg?.id === org.id ? 'bg-primary-light text-primary font-medium' : 'text-text'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-primary-light grid place-items-center text-[9px] font-serif text-primary"
                  style={{ fontFamily: 'var(--font-serif)' }}>
                  {org.name[0].toUpperCase()}
                </span>
                <span className="truncate">{org.name}</span>
              </button>
            ))}

            <div className="border-t border-gray-border my-1" />
            <button
              onClick={() => { onCreateOrg(); setOrgOpen(false) }}
              className="w-full px-3 py-2 text-[12px] text-left cursor-pointer hover:bg-surface-2 transition-colors text-primary font-medium"
            >
              + Crear organización
            </button>
          </div>
        )}
      </div>

      {/* Primary nav */}
      <nav className="p-3 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeView === item.view
          return (
            <div
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] mb-0.5 transition-colors ${
                isActive
                  ? 'bg-primary-light text-primary font-medium'
                  : 'text-text-muted hover:bg-surface-2'
              }`}
            >
              <Icon name={item.icon} size={16} />
              <span className="flex-1">{item.label}</span>
              {item.view === 'agenda' && agendaBadge != null && agendaBadge > 0 && (
                <span className="bg-primary text-surface text-[10px] font-semibold px-[7px] py-px rounded-full">
                  {agendaBadge}
                </span>
              )}
              {item.view === 'config' && showBotLock && (
                <span className="bg-primary text-surface text-[9px] font-semibold uppercase tracking-wider px-1.5 py-px rounded-full">
                  Pro
                </span>
              )}
            </div>
          )
        })}
      </nav>

      {/* Bottom nav */}
      <div className="p-3 border-t border-gray-border">
        <div
          onClick={() => onNavigate(bottomTabView)}
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] mb-0.5 transition-colors ${
            activeView === bottomTabView
              ? 'bg-primary-light text-primary font-medium'
              : 'text-text-muted hover:bg-surface-2'
          }`}
        >
          <Icon name={bottomTabIcon} size={16} />
          <span className="flex-1">{bottomTabLabel}</span>
        </div>
        {onLogout && (
          <div
            onClick={onLogout}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-[13px] text-text-muted hover:bg-surface-2 transition-colors"
          >
            <Icon name="logout" size={16} />
            <span>Cerrar sesión</span>
          </div>
        )}
      </div>

      {/* Brand */}
      <div className="px-[18px] py-[14px] border-t border-gray-border">
        {currentOrg?.logo_url ? (
          <img src={currentOrg.logo_url} alt={currentOrg.name} className="h-6 max-w-[120px] object-contain" />
        ) : (
          <div className="text-[16px] italic text-primary" style={{ fontFamily: 'var(--font-serif)' }}>
            MediBot
          </div>
        )}
        <div className="text-[10px] text-text-hint mt-[2px]">
          {currentOrg ? currentOrg.name : 'Panel profesional'}
        </div>
      </div>
    </aside>
  )
}
