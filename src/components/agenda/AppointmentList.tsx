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
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-semibold text-text">
          Turnos · <span className="text-text-muted font-medium">{dayLabel}</span>
        </div>
        <div className="text-[11px] text-text-hint">
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
