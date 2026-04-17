import { useState, useRef, useEffect } from 'react'
import type { Organization } from '../../lib/hooks'
import { canUseBot, type PlanId } from '../../lib/plans'

export type View = 'agenda' | 'pacientes' | 'bloqueos' | 'estadisticas' | 'config' | 'perfil' | 'organizacion'

const navItems: { icon: string; label: string; view: View }[] = [
  { icon: '📅', label: 'Agenda', view: 'agenda' },
  { icon: '👥', label: 'Pacientes', view: 'pacientes' },
  { icon: '🏖️', label: 'Bloqueos', view: 'bloqueos' },
  { icon: '📊', label: 'Estadísticas', view: 'estadisticas' },
  { icon: '💬', label: 'WhatsApp Bot', view: 'config' },
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
  const displaySub = isOrg ? (isOrgAdmin ? 'Admin' : 'Miembro') : (doctorSub || '')
  const initials = isOrg
    ? currentOrg.name[0].toUpperCase()
    : doctorName ? doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'MB'
  const hasLogo = isOrg && currentOrg.logo_url

  // Bottom tab: perfil in personal mode, organizacion in org mode
  const bottomTabView: View = isOrg ? 'organizacion' : 'perfil'
  const bottomTabLabel = isOrg ? 'Organizacion' : 'Mi perfil'
  const bottomTabIcon = isOrg ? '🏥' : '👤'

  return (
    <aside className="hidden lg:flex w-[220px] bg-white border-r border-gray-border flex-col shrink-0">
      {/* Profile/Org header - click opens dropdown */}
      <div className="border-b border-gray-border relative" ref={orgRef}>
        <div
          onClick={() => setOrgOpen(!orgOpen)}
          className={`px-3.5 py-3 flex items-center gap-2.5 cursor-pointer transition-colors hover:bg-gray-bg`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 overflow-hidden ${
            isOrg ? 'bg-primary text-white' : 'bg-primary-light text-primary'
          }`}>
            {hasLogo ? (
              <img src={currentOrg.logo_url!} alt="" className="w-full h-full object-cover" />
            ) : initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">{displayName}</div>
            <div className="text-[11px] text-text-hint truncate">{displaySub}</div>
          </div>
          <div className="w-7 h-7 rounded-full border border-gray-border bg-white flex items-center justify-center text-text-hint shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d={orgOpen ? 'M17 14l-5-5-5 5' : 'M7 10l5 5 5-5'} />
            </svg>
          </div>
        </div>

        {/* Dropdown */}
        {orgOpen && (
          <div className="absolute left-2.5 right-2.5 top-full mt-1 bg-white border border-gray-border rounded-md shadow-lg z-50 py-1">
            <button
              onClick={() => { onSwitchOrg(null); setOrgOpen(false) }}
              className={`w-full px-3 py-2 text-[12px] text-left cursor-pointer hover:bg-gray-bg transition-colors flex items-center gap-2 ${
                !currentOrg ? 'bg-primary-light text-primary font-medium' : 'text-text'
              }`}
            >
              <span className="w-4 h-4 rounded bg-gray-bg flex items-center justify-center text-[8px] font-semibold text-text-hint">P</span>
              Personal
            </button>

            {organizations.length > 0 && <div className="border-t border-gray-border my-1" />}

            {organizations.map((org) => (
              <button
                key={org.id}
                onClick={() => { onSwitchOrg(org); setOrgOpen(false) }}
                className={`w-full px-3 py-2 text-[12px] text-left cursor-pointer hover:bg-gray-bg transition-colors flex items-center gap-2 ${
                  currentOrg?.id === org.id ? 'bg-primary-light text-primary font-medium' : 'text-text'
                }`}
              >
                <span className="w-4 h-4 rounded bg-primary-light flex items-center justify-center text-[8px] font-semibold text-primary">
                  {org.name[0].toUpperCase()}
                </span>
                <span className="truncate">{org.name}</span>
              </button>
            ))}

            <div className="border-t border-gray-border my-1" />
            <button
              onClick={() => { onCreateOrg(); setOrgOpen(false) }}
              className="w-full px-3 py-2 text-[12px] text-left cursor-pointer hover:bg-gray-bg transition-colors text-primary"
            >
              + Crear organizacion
            </button>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="p-3 flex-1 overflow-y-auto">
        {navItems.map((item) => (
          <div
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-[13px] mb-0.5 transition-colors ${
              activeView === item.view
                ? 'bg-primary-light text-primary font-medium'
                : 'text-text-muted hover:bg-gray-bg'
            }`}
          >
            <span className="text-[15px] w-5 text-center">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.view === 'agenda' && agendaBadge != null && agendaBadge > 0 && (
              <span className="ml-auto bg-primary text-white text-[10px] font-semibold px-1.5 py-px rounded-full">
                {agendaBadge}
              </span>
            )}
            {item.view === 'config' && showBotLock && (
              <span className="ml-auto bg-gradient-to-r from-primary to-[#534AB7] text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-px rounded-full">
                Pro
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom tab: Mi perfil / Organizacion */}
      <div
        onClick={() => onNavigate(bottomTabView)}
        className={`mx-3 mb-2.5 flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-[13px] transition-colors ${
          activeView === bottomTabView
            ? 'bg-primary-light text-primary font-medium'
            : 'text-text-muted hover:bg-gray-bg'
        }`}
      >
        <span className="text-[15px] w-5 text-center">{bottomTabIcon}</span>
        {bottomTabLabel}
      </div>

      {/* Logo - bottom */}
      <div className="px-5 py-3 border-t border-gray-border">
        {currentOrg?.logo_url ? (
          <img src={currentOrg.logo_url} alt={currentOrg.name} className="h-6 max-w-[120px] object-contain" />
        ) : (
          <div className="text-sm font-semibold text-primary">MediBot</div>
        )}
        <div className="text-[10px] text-text-hint mt-px">
          {currentOrg ? currentOrg.name : 'Panel profesional'}
        </div>
      </div>
    </aside>
  )
}
