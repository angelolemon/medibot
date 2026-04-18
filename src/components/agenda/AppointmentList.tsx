import type { Appointment } from '../../data/appointments'
import AppointmentCard from './AppointmentCard'

interface Props {
  appointments: Appointment[]
  selectedId: string | null
  onSelect: (appointment: Appointment) => void
  onCancel: (id: string) => void
  onSendIndicaciones: (appointment: Appointment) => void
  onRecordar: (appointment: Appointment) => void
  dayLabel: string
}

export default function AppointmentList({
  appointments,
  selectedId,
  onSelect,
  onCancel,
  onSendIndicaciones,
  onRecordar,
  dayLabel,
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
          onSendIndicaciones={onSendIndicaciones}
          onRecordar={onRecordar}
        />
      ))}
    </div>
  )
}
