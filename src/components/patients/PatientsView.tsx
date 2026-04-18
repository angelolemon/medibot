import { useState } from 'react'
import type { Patient } from '../../data/appointments'
import PageHeader from '../PageHeader'
import Icon from '../Icon'
import Btn from '../Btn'

interface Props {
  patients: Patient[]
  onSelectPatient: (patient: Patient) => void
  selectedPatient: Patient | null
}

export default function PatientsView({ patients, onSelectPatient, selectedPatient }: Props) {
  const [search, setSearch] = useState('')

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-bg">
      <div className="px-8 sm:px-10 pt-8 pb-10 overflow-y-auto flex-1 pb-20 lg:pb-10">
        <PageHeader
          title="Pacientes."
          subtitle={`${patients.length} pacientes registrados en tu práctica.`}
          right={<Btn variant="primary"><Icon name="plus" size={13} /> Nuevo paciente</Btn>}
        />

        {/* Search */}
        <div className="relative mb-4">
          <Icon
            name="search"
            size={14}
            style={{ position: 'absolute', left: 14, top: 13, color: 'var(--color-text-hint)' }}
          />
          <input
            type="text"
            placeholder="Buscar paciente por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-[14px] border border-gray-border bg-surface text-[13px] text-text placeholder:text-text-hint focus:border-primary-mid"
          />
        </div>

        {search && (
          <div className="text-[10px] text-text-hint mb-3 uppercase tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono)' }}>
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Patient cards */}
        <div className="flex flex-col gap-2">
          {filtered.map((patient) => {
            const isSelected = selectedPatient?.name === patient.name
            return (
              <div
                key={patient.name}
                onClick={() => onSelectPatient(patient)}
                className={`border rounded-[14px] px-[18px] py-[14px] cursor-pointer transition-colors flex items-center gap-3.5 ${
                  isSelected
                    ? 'border-primary-mid bg-primary-light'
                    : 'border-gray-border bg-surface hover:border-gray-border-2'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full bg-primary-light grid place-items-center text-[14px] text-primary shrink-0"
                  style={{ fontFamily: 'var(--font-serif)' }}
                >
                  {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium text-text">{patient.name}</div>
                  <div className="text-[12px] text-text-muted mt-[3px] flex items-center gap-2">
                    <span className={`inline-block text-[11px] font-medium px-[9px] py-[2px] rounded-full ${
                      patient.insurance === 'Particular'
                        ? 'bg-amber-light text-amber'
                        : 'bg-teal-light text-teal'
                    }`}>
                      {patient.insurance}
                    </span>
                    <span>{patient.age}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <div className="text-[12px] text-text-muted">Últ. visita {patient.lastVisit}</div>
                  <div className="text-[11px] text-text-hint mt-[2px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {patient.totalSessions} sesiones
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <div className="text-text-hint text-sm">No se encontraron pacientes</div>
            <div className="text-text-hint text-xs mt-1">Probá con otro nombre</div>
          </div>
        )}
      </div>
    </div>
  )
}
