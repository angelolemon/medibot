import { useState, useRef, useEffect } from 'react'
import type { Organization } from '../../lib/hooks'

interface Props {
  organizations: Organization[]
  currentOrg: Organization | null
  onSwitch: (org: Organization | null) => void
  onCreate: () => void
}

export default function OrgSwitcher({ organizations, currentOrg, onSwitch, onCreate }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (organizations.length === 0 && !currentOrg) {
    return (
      <button
        onClick={onCreate}
        className="w-full px-2.5 py-2 rounded-md text-[12px] text-primary cursor-pointer hover:bg-primary-light transition-colors text-left"
      >
        + Crear organizacion
      </button>
    )
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-2.5 py-2 rounded-md text-[12px] cursor-pointer hover:bg-gray-bg transition-colors flex items-center gap-2 border border-gray-border bg-white"
      >
        <span className="w-5 h-5 rounded bg-primary-light flex items-center justify-center text-[9px] font-semibold text-primary shrink-0">
          {currentOrg ? currentOrg.name[0].toUpperCase() : 'P'}
        </span>
        <span className="flex-1 text-left truncate text-text">
          {currentOrg ? currentOrg.name : 'Personal'}
        </span>
        <span className="text-text-hint text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 bottom-full mb-1 bg-white border border-gray-border rounded-md shadow-lg z-50 py-1">
          {/* Personal option */}
          <button
            onClick={() => { onSwitch(null); setOpen(false) }}
            className={`w-full px-3 py-2 text-[12px] text-left cursor-pointer hover:bg-gray-bg transition-colors flex items-center gap-2 ${
              !currentOrg ? 'bg-primary-light text-primary font-medium' : 'text-text'
            }`}
          >
            <span className="w-4 h-4 rounded bg-gray-bg flex items-center justify-center text-[8px] font-semibold text-text-hint">P</span>
            Personal
          </button>

          {organizations.length > 0 && (
            <div className="border-t border-gray-border my-1" />
          )}

          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => { onSwitch(org); setOpen(false) }}
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
            onClick={() => { onCreate(); setOpen(false) }}
            className="w-full px-3 py-2 text-[12px] text-left cursor-pointer hover:bg-gray-bg transition-colors text-primary"
          >
            + Crear organizacion
          </button>
        </div>
      )}
    </div>
  )
}
