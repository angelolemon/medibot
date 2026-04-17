import type { Appointment } from '../../data/appointments'

const statusLineColor: Record<string, string> = {
  confirmado: 'bg-teal',
  pendiente: 'bg-[#EF9F27]',
  cancelado: 'bg-[#E24B4A]',
  libre: 'bg-[#D3D1C7]',
  bloqueado: 'bg-[#999]',
}

const badgeStyles: Record<string, string> = {
  confirmado: 'bg-teal-light text-teal',
  pendiente: 'bg-amber-light text-amber',
  cancelado: 'bg-coral-light text-coral',
  libre: 'bg-gray-bg text-text-hint',
  bloqueado: 'bg-gray-bg text-text-hint',
}

const badgeLabel: Record<string, string> = {
  confirmado: 'Confirmado',
  pendiente: 'Sin confirmar',
  cancelado: 'Cancelado',
  libre: 'Disponible para pacientes',
  bloqueado: 'Horario bloqueado',
}

interface Props {
  appointment: Appointment
  isSelected: boolean
  onSelect: (appointment: Appointment) => void
  onCancel: (id: string) => void
  onSendIndicaciones: (appointment: Appointment) => void
  onRecordar: (appointment: Appointment) => void
}

export default function AppointmentCard({
  appointment,
  isSelected,
  onSelect,
  onCancel,
  onSendIndicaciones,
  onRecordar,
}: Props) {
  const isLibre = appointment.status === 'libre'
  const isBloqueado = appointment.status === 'bloqueado'
  const isInactive = isLibre || isBloqueado

  return (
    <div
      onClick={() => onSelect(appointment)}
      className={`group bg-white border rounded-[10px] px-4 py-3.5 mb-2 flex flex-wrap sm:flex-nowrap items-center gap-3.5 cursor-pointer transition-shadow ${
        isSelected
          ? 'border-primary-mid bg-[#FAFAFE]'
          : isBloqueado
            ? 'border-gray-border bg-gray-bg/50'
            : 'border-gray-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.07)]'
      }`}
    >
      {/* Time */}
      <div className="min-w-[52px] text-center">
        <div className={`text-sm font-semibold ${isInactive ? 'text-[#bbb]' : 'text-primary'}`}>
          {appointment.time}
        </div>
        <div className="text-[11px] text-text-hint">{appointment.duration}</div>
      </div>

      {/* Status line */}
      <div className={`w-0.5 h-9 rounded-sm shrink-0 hidden sm:block ${statusLineColor[appointment.status]}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${isInactive ? 'text-text-hint font-normal' : ''}`}>
          {isBloqueado
            ? appointment.patientName
              ? <>🚫 {appointment.patientName}</>
              : <>🚫 Horario bloqueado</>
            : isLibre ? 'Horario libre' : appointment.patientName}
        </div>
        <div className="text-xs text-text-muted mt-0.5 flex items-center gap-1.5 flex-wrap">
          {appointment.doctorLabel && (
            <span className="inline-block text-[11px] font-medium px-2 py-px rounded-full bg-primary-light text-primary">
              {appointment.doctorLabel}
            </span>
          )}
          {!isLibre && <span>{appointment.detail}</span>}
          <span className={`inline-block text-[11px] font-medium px-2 py-px rounded-full ${badgeStyles[appointment.status]}`}>
            {badgeLabel[appointment.status]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className={`flex gap-1.5 shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} max-lg:opacity-100`}>
        {appointment.status === 'confirmado' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onSendIndicaciones(appointment) }}
              className="text-[11px] px-2 py-1 rounded-md border border-primary-mid bg-primary-light text-primary cursor-pointer whitespace-nowrap"
            >
              📤 Indicaciones
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(appointment.id) }}
              className="text-[11px] px-2 py-1 rounded-md border border-gray-border bg-white text-text-muted cursor-pointer hover:bg-gray-bg"
            >
              Cancelar
            </button>
          </>
        )}
        {appointment.status === 'pendiente' && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onRecordar(appointment) }}
              className="text-[11px] px-2 py-1 rounded-md border border-primary-mid bg-primary-light text-primary cursor-pointer whitespace-nowrap"
            >
              📲 Recordar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCancel(appointment.id) }}
              className="text-[11px] px-2 py-1 rounded-md border border-gray-border bg-white text-text-muted cursor-pointer hover:bg-gray-bg"
            >
              Cancelar
            </button>
          </>
        )}
        {appointment.status === 'cancelado' && (
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] px-2 py-1 rounded-md border border-gray-border bg-white text-text-muted cursor-pointer hover:bg-gray-bg"
          >
            + Reasignar
          </button>
        )}
        {appointment.status === 'libre' && (
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] px-2 py-1 rounded-md border border-gray-border bg-white text-text-muted cursor-pointer hover:bg-gray-bg"
          >
            Bloquear
          </button>
        )}
      </div>
    </div>
  )
}
