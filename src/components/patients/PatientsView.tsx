import { useState } from 'react'
import type { Patient } from '../../data/appointments'

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-bg">
      <div className="p-6 sm:p-8 overflow-y-auto flex-1 pb-20 lg:pb-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-[36px] sm:text-[44px] font-bold text-text leading-[1.05] tracking-tight">Pacientes</h1>
            <p className="text-[14px] text-text-muted mt-2">{patients.length} pacientes registrados en tu práctica.</p>
          </div>
        </div>
        {/* Search bar */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-hint text-sm">🔍</span>
          <input
            type="text"
            placeholder="Buscar paciente por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-[16px] border border-gray-border bg-white text-sm placeholder:text-text-hint focus:outline-none focus:border-primary-mid focus:ring-1 focus:ring-primary-mid"
          />
        </div>

        {/* Results count */}
        {search && (
          <div className="text-xs text-text-hint mb-3">
            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Patient cards */}
        <div className="space-y-2">
          {filtered.map((patient) => (
            <div
              key={patient.name}
              onClick={() => onSelectPatient(patient)}
              className={`bg-white border rounded-[16px] px-4 py-3.5 cursor-pointer transition-shadow flex items-center gap-3.5 ${
                selectedPatient?.name === patient.name
                  ? 'border-primary-mid bg-[#FAFAFE]'
                  : 'border-gray-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]'
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{patient.name}</div>
                <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className={`inline-block text-[11px] font-medium px-2 py-px rounded-full ${
                    patient.insurance === 'Particular'
                      ? 'bg-amber-light text-amber'
                      : 'bg-teal-light text-teal'
                  }`}>
                    {patient.insurance}
                  </span>
                  <span>{patient.age}</span>
                </div>
              </div>

              {/* Last visit + sessions */}
              <div className="text-right shrink-0 hidden sm:block">
                <div className="text-xs text-text-muted">{patient.lastVisit}</div>
                <div className="text-[11px] text-text-hint">{patient.totalSessions} sesiones</div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-10">
            <div className="text-text-hint text-sm">No se encontraron pacientes</div>
            <div className="text-text-hint text-xs mt-1">Probá con otro nombre</div>
          </div>
        )}
      </div>
    </div>
  )
}
