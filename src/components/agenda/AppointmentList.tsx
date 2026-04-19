import type { Appointment } from '../../data/appointments'
import type { LocationRow } from '../../lib/hooks'
import AppointmentCard from './AppointmentCard'

interface Props {
  appointments: Appointment[]
  selectedId: string | null
  onSelect: (appointment: Appointment) => void
  onCancel: (id: string) => void
  onRecordar: (appointment: Appointment) => void
  onReasignar?: (appointment: Appointment) => void
  dayLabel: string
  locations?: LocationRow[]
}

export default function AppointmentList({
  appointments,
  selectedId,
  onSelect,
  onCancel,
  onRecordar,
  onReasignar,
  dayLabel,
  locations,
}: Props) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div
          className="text-[10px] text-text-hint uppercase tracking-[0.12em]"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Turnos · {dayLabel}
        </div>
        <div className="text-[10px] text-text-hint" style={{ fontFamily: 'var(--font-mono)' }}>
          {appointments.length} {appointments.length === 1 ? 'turno' : 'turnos'}
        </div>
      </div>
      {appointments.map((apt) => (
        <AppointmentCard
          key={apt.id}
          appointment={apt}
          isSelected={selectedId === apt.id}
          onSelect={onSelect}
          onCancel={onCancel}
          onRecordar={onRecordar}
          onReasignar={onReasignar}
          locations={locations}
        />
      ))}
    </div>
  )
}
