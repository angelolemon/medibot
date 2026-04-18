import type { Appointment } from '../../data/appointments'
import Icon from '../Icon'
import Btn from '../Btn'

const statusLineColor: Record<string, string> = {
  confirmado: 'bg-teal',
  pendiente: 'bg-amber',
  cancelado: 'bg-coral',
  libre: 'bg-gray-border-2',
  bloqueado: 'bg-text-dim',
}

const badgeStyles: Record<string, string> = {
  confirmado: 'bg-teal-light text-teal',
  pendiente: 'bg-amber-light text-amber',
  cancelado: 'bg-coral-light text-coral',
  libre: 'bg-surface-2 text-text-hint',
  bloqueado: 'bg-surface-2 text-text-hint',
}

const badgeLabel: Record<string, string> = {
  confirmado: 'Confirmado',
  pendiente: 'Sin confirmar',
  cancelado: 'Cancelado',
  libre: 'Disponible',
  bloqueado: 'Bloqueado',
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
      className={`group border rounded-[12px] px-[18px] py-[14px] mb-2 flex flex-wrap sm:flex-nowrap items-center gap-4 cursor-pointer transition-colors ${
        isSelected
          ? 'border-primary-mid bg-primary-light'
          : isBloqueado
            ? 'border-gray-border bg-surface-2'
            : 'border-gray-border bg-surface hover:border-gray-border-2'
      }`}
    >
      {/* Time */}
      <div className="min-w-[56px] text-center">
        <div
          className={`text-[18px] tracking-[-0.015em] leading-none ${isInactive ? 'text-text-dim' : 'text-primary'}`}
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {appointment.time}
        </div>
        <div className="text-[10px] text-text-hint mt-1" style={{ fontFamily: 'var(--font-mono)' }}>
          {appointment.duration}
        </div>
      </div>

      {/* Status line */}
      <div className={`w-[2px] h-9 rounded-[1px] shrink-0 hidden sm:block ${statusLineColor[appointment.status]}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] font-medium ${isInactive ? 'text-text-hint font-normal' : 'text-text'}`}>
          {isBloqueado
            ? 'Horario bloqueado'
            : isLibre ? 'Horario libre' : appointment.patientName}
        </div>
        <div className="text-[12px] text-text-muted mt-[3px] flex items-center gap-2.5 flex-wrap">
          {appointment.doctorLabel && (
            <span className="inline-block text-[11px] font-medium px-2 py-[2px] rounded-full bg-primary-light text-primary">
              {appointment.doctorLabel}
            </span>
          )}
          {!isLibre && !isBloqueado && appointment.detail && <span>{appointment.detail}</span>}
          <span className={`inline-block text-[11px] font-medium px-[9px] py-[2px] rounded-full ${badgeStyles[appointment.status]}`}>
            {badgeLabel[appointment.status]}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className={`flex gap-1.5 shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} max-lg:opacity-100`}>
        {appointment.status === 'confirmado' && (
          <>
            <Btn size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); onSendIndicaciones(appointment) }}>
              <Icon name="send" size={12} /> Indicaciones
            </Btn>
            <Btn size="sm" onClick={(e) => { e.stopPropagation(); onCancel(appointment.id) }}>Cancelar</Btn>
          </>
        )}
        {appointment.status === 'pendiente' && (
          <>
            <Btn size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); onRecordar(appointment) }}>
              <Icon name="chat" size={12} /> Recordar
            </Btn>
            <Btn size="sm" onClick={(e) => { e.stopPropagation(); onCancel(appointment.id) }}>Cancelar</Btn>
          </>
        )}
        {appointment.status === 'cancelado' && (
          <Btn size="sm" onClick={(e) => e.stopPropagation()}>
            <Icon name="plus" size={12} /> Reasignar
          </Btn>
        )}
        {appointment.status === 'libre' && (
          <Btn size="sm" onClick={(e) => e.stopPropagation()}>Bloquear</Btn>
        )}
      </div>
    </div>
  )
}
