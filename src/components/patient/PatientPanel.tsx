import { useState } from 'react'
import type { Appointment } from '../../data/appointments'

interface Props {
  appointment: Appointment | null
  dayAppointments: Appointment[]
  dayLabel: string
  selectedDate?: string
  isBlocked?: boolean
  blockReason?: string
  onUnblock?: () => void
  onBlockHours?: (date: string, from: string, to: string) => void
}

export default function PatientPanel({ appointment, dayAppointments, dayLabel, selectedDate, isBlocked, blockReason, onUnblock, onBlockHours }: Props) {
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [blockFrom, setBlockFrom] = useState('09:00')
  const [blockTo, setBlockTo] = useState('13:00')
  // Selected turno: show patient detail
  if (appointment) {
    if (appointment.status === 'libre') {
      return (
        <Panel>
          <PanelHeader>Horario libre</PanelHeader>
          <div className="px-[18px] py-4 flex-1">
            <p className="text-[13px] text-[#bbb] mt-4">
              Este horario está disponible para reservas desde el bot de WhatsApp.
            </p>
            <button className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] cursor-pointer border border-gray-border bg-white text-text hover:bg-gray-bg transition-colors">
              🚫 Bloquear horario
            </button>
          </div>
        </Panel>
      )
    }

    const patient = appointment.patient || {
      name: appointment.patientName || 'Sin datos',
      phone: '',
      email: '',
      age: '',
      since: '',
      insurance: 'Particular',
      lastVisit: '',
      totalSessions: 0,
      tags: [] as string[],
      history: [] as { date: string; text: string }[],
    }
    return (
      <Panel>
        <PanelHeader>{patient.name}</PanelHeader>
        <div className="px-[18px] py-4 flex-1 overflow-y-auto">
          <Field label="Teléfono" value={patient.phone || '—'} isLink />
          <Field label="Edad" value={patient.age || '—'} />
          <Field label="Vínculo" value={patient.since || '—'} />

          <div className="mb-3.5">
            <div className="text-[11px] text-text-hint uppercase tracking-wide mb-1">Etiquetas</div>
            <div className="flex flex-wrap gap-1">
              {(patient.tags || []).map((tag) => (
                <span key={tag} className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-primary-light text-primary">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3.5">
            <div className="text-[11px] text-text-hint uppercase tracking-wide mb-2">
              Historial de sesiones
            </div>
            {(!patient.history || patient.history.length === 0) ? (
              <div className="text-xs text-[#bbb]">Sin historial previo</div>
            ) : (
              patient.history.map((h, i) => (
                <div
                  key={i}
                  className={`py-2 text-xs text-text-muted ${
                    i < patient.history.length - 1 ? 'border-b border-gray-border' : ''
                  }`}
                >
                  <div className="text-[11px] text-text-hint">{h.date}</div>
                  {h.text}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="px-[18px] py-3.5 border-t border-gray-border flex gap-2 shrink-0">
          <button className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-[7px] rounded-md text-xs cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors">
            📤 Enviar indicaciones
          </button>
          <button className="inline-flex items-center justify-center px-3 py-[7px] rounded-md text-xs cursor-pointer border border-gray-border bg-white text-text-muted hover:bg-gray-bg transition-colors">
            💬
          </button>
        </div>
      </Panel>
    )
  }

  // No turno selected: show day summary
  const total = dayAppointments.length
  const withPatient = dayAppointments.filter((a) => a.status !== 'libre')
  const pacientes = new Set(withPatient.map((a) => a.patientName).filter(Boolean)).size
  const confirmados = dayAppointments.filter((a) => a.status === 'confirmado').length
  const pendientes = dayAppointments.filter((a) => a.status === 'pendiente').length
  const cancelados = dayAppointments.filter((a) => a.status === 'cancelado').length
  const libres = dayAppointments.filter((a) => a.status === 'libre').length

  const sorted = [...dayAppointments].sort((a, b) => a.time.localeCompare(b.time))
  const firstTime = sorted[0]?.time ?? '—'
  const lastAppt = sorted[sorted.length - 1]
  const lastTime = lastAppt ? lastAppt.time : '—'

  // Calculate end time of last appointment
  let endTime = '—'
  if (lastAppt) {
    const [h, m] = lastAppt.time.split(':').map(Number)
    const durMin = parseInt(lastAppt.duration) || 50
    const endDate = new Date(2026, 0, 1, h, m + durMin)
    endTime = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
  }

  const ocupacion = total > 0 ? Math.round(((total - libres) / total) * 100) : 0

  return (
    <Panel>
      <PanelHeader>Resumen del día</PanelHeader>
      <div className="px-[18px] py-4 flex-1 overflow-y-auto">
        <div className="text-xs text-text-hint mb-4 uppercase tracking-wide">{dayLabel}</div>

        {isBlocked && (
          <div className="flex items-center gap-2 bg-coral-light rounded-lg px-3 py-2.5 mb-4">
            <span className="text-sm">🏖️</span>
            <div>
              <div className="text-xs font-medium text-coral">{blockReason ?? 'Bloqueado'}</div>
              <div className="text-[10px] text-coral/70">No se aceptan turnos</div>
            </div>
          </div>
        )}

        {total === 0 && !isBlocked ? (
          <p className="text-[13px] text-[#bbb]">No hay turnos agendados para este día.</p>
        ) : total === 0 && isBlocked ? (
          <p className="text-[13px] text-[#bbb]">Día sin turnos — bloqueado.</p>
        ) : (
          <>
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <StatCard label="Pacientes" value={String(pacientes)} />
              <StatCard label="Turnos" value={String(total)} />
              <StatCard label="Inicio" value={firstTime} />
              <StatCard label="Fin" value={endTime} />
            </div>

            {/* Status breakdown */}
            <div className="mb-4">
              <div className="text-[11px] text-text-hint uppercase tracking-wide mb-2">Estado de turnos</div>
              <div className="space-y-1.5">
                {confirmados > 0 && <StatusRow color="bg-teal" label="Confirmados" count={confirmados} />}
                {pendientes > 0 && <StatusRow color="bg-[#EF9F27]" label="Pendientes" count={pendientes} />}
                {cancelados > 0 && <StatusRow color="bg-[#E24B4A]" label="Cancelados" count={cancelados} />}
                {libres > 0 && <StatusRow color="bg-[#D3D1C7]" label="Libres" count={libres} />}
              </div>
            </div>

            {/* Occupancy */}
            <div className="mb-4">
              <div className="text-[11px] text-text-hint uppercase tracking-wide mb-2">Ocupación</div>
              <div className="w-full bg-gray-bg rounded-full h-2 mb-1">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${ocupacion}%` }}
                />
              </div>
              <div className="text-xs text-text-muted">{ocupacion}% de los turnos asignados</div>
            </div>

            {/* Patients list */}
            <div className="mb-4">
              <div className="text-[11px] text-text-hint uppercase tracking-wide mb-2">Pacientes del día</div>
              {Array.from(new Set(withPatient.map((a) => a.patientName))).filter(Boolean).map((name) => {
                const apt = withPatient.find((a) => a.patientName === name)!
                return (
                  <div key={name} className="flex items-center gap-2 py-1.5 border-b border-gray-border last:border-b-0">
                    <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                      {name!.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">{name}</div>
                      <div className="text-[10px] text-text-hint">{apt.time}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer: day actions */}
      {isBlocked ? (
        <div className="px-[18px] py-3.5 border-t border-gray-border shrink-0">
          <button
            onClick={onUnblock}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] cursor-pointer border border-coral bg-white text-coral hover:bg-coral-light transition-colors"
          >
            Desbloquear este período
          </button>
        </div>
      ) : (
        <div className="px-[18px] py-3.5 border-t border-gray-border shrink-0 flex flex-col gap-2">
          {total > 0 && (
            <button
              onClick={() => alert(`Enviando recordatorio por WhatsApp a ${pacientes} pacientes...`)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors"
            >
              📲 Recordar a todos
            </button>
          )}

          {showBlockForm ? (
            <BlockHoursForm
              dayAppointments={dayAppointments}
              blockFrom={blockFrom}
              blockTo={blockTo}
              showConfirm={showBlockConfirm}
              onChangeFrom={(v) => { setBlockFrom(v); setShowBlockConfirm(false) }}
              onChangeTo={(v) => { setBlockTo(v); setShowBlockConfirm(false) }}
              onContinue={() => setShowBlockConfirm(true)}
              onBlockHours={() => { if (selectedDate && onBlockHours) onBlockHours(selectedDate, blockFrom, blockTo) }}
              onBack={() => setShowBlockConfirm(false)}
              onConfirm={() => { setShowBlockForm(false); setShowBlockConfirm(false) }}
              onCancel={() => { setShowBlockForm(false); setShowBlockConfirm(false) }}
            />
          ) : (
            <button
              onClick={() => setShowBlockForm(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] cursor-pointer border border-gray-border bg-white text-text hover:bg-gray-bg transition-colors"
            >
              🚫 Bloquear horario/s
            </button>
          )}
        </div>
      )}
    </Panel>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden lg:flex w-[280px] bg-white border-l border-gray-border flex-col shrink-0 h-full">
      {children}
    </div>
  )
}

function PanelHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-[18px] pt-5 pb-4 border-b border-gray-border shrink-0">
      <div className="text-[15px] font-semibold">{children}</div>
    </div>
  )
}

function Field({ label, value, isLink }: { label: string; value: string; isLink?: boolean }) {
  return (
    <div className="mb-3.5">
      <div className="text-[11px] text-text-hint uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-[13px] ${isLink ? 'text-primary' : 'text-text'}`}>{value}</div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-bg rounded-lg px-3 py-2 text-center">
      <div className="text-lg font-semibold text-text">{value}</div>
      <div className="text-[10px] text-text-hint uppercase tracking-wide">{label}</div>
    </div>
  )
}

function StatusRow({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
      <span className="text-text-muted flex-1">{label}</span>
      <span className="font-medium text-text">{count}</span>
    </div>
  )
}

function BlockHoursForm({ dayAppointments, blockFrom, blockTo, showConfirm, onChangeFrom, onChangeTo, onContinue, onBack, onConfirm, onCancel, onBlockHours }: {
  dayAppointments: Appointment[]
  blockFrom: string
  blockTo: string
  showConfirm: boolean
  onChangeFrom: (v: string) => void
  onChangeTo: (v: string) => void
  onContinue: () => void
  onBack: () => void
  onConfirm: () => void
  onCancel: () => void
  onBlockHours: () => void
}) {
  const affectedAppts = dayAppointments.filter(
    (a) => a.status !== 'libre' && a.status !== 'bloqueado' && a.time >= blockFrom && a.time < blockTo
  )
  const affectedNames = Array.from(new Set(affectedAppts.map((a) => a.patientName).filter(Boolean)))
  const validRange = blockTo > blockFrom

  if (showConfirm && validRange) {
    return (
      <div className="bg-amber-light rounded-lg p-3">
        <div className="text-[11px] text-amber font-semibold mb-2">Confirmar bloqueo</div>
        <div className="text-xs text-amber mb-1">
          Bloquear de <strong>{blockFrom}</strong> a <strong>{blockTo}</strong>
        </div>
        {affectedNames.length > 0 ? (
          <>
            <div className="text-xs text-coral font-medium mb-1.5">
              ⚠️ {affectedNames.length} paciente{affectedNames.length !== 1 ? 's' : ''} afectado{affectedNames.length !== 1 ? 's' : ''}:
            </div>
            <div className="space-y-1 mb-2.5">
              {affectedAppts.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 text-[11px]">
                  <div className="w-4 h-4 rounded-full bg-coral-light flex items-center justify-center text-[8px] font-semibold text-coral shrink-0">
                    {a.patientName!.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <span className="text-text">{a.patientName}</span>
                  <span className="text-text-hint ml-auto">{a.time}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-coral/80 mb-2">
              Se cancelarán estos turnos y se notificará a los pacientes por WhatsApp.
            </div>
          </>
        ) : (
          <div className="text-xs text-teal mb-2.5">
            No hay pacientes afectados en este rango.
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => {
              onBlockHours()
              onConfirm()
            }}
            className="flex-1 inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs cursor-pointer border border-coral bg-coral text-white hover:bg-[#7a3017] transition-colors"
          >
            {affectedNames.length > 0 ? 'Bloquear y notificar' : 'Bloquear'}
          </button>
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-md text-xs cursor-pointer border border-gray-border bg-white text-text-muted hover:bg-gray-bg transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-bg rounded-lg p-3">
      <div className="text-[11px] text-text-hint uppercase tracking-wide mb-2">Bloquear horario/s</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1">
          <label className="text-[10px] text-text-hint mb-0.5 block">Desde</label>
          <input
            type="time"
            value={blockFrom}
            onChange={(e) => onChangeFrom(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-gray-border text-xs bg-white focus:outline-none focus:border-primary-mid"
          />
        </div>
        <div className="flex-1">
          <label className="text-[10px] text-text-hint mb-0.5 block">Hasta</label>
          <input
            type="time"
            value={blockTo}
            onChange={(e) => onChangeTo(e.target.value)}
            className="w-full px-2 py-1.5 rounded-md border border-gray-border text-xs bg-white focus:outline-none focus:border-primary-mid"
          />
        </div>
      </div>
      {!validRange && (
        <div className="text-[10px] text-coral mb-2">La hora de fin debe ser posterior a la de inicio</div>
      )}
      {validRange && affectedNames.length > 0 && (
        <div className="text-[10px] text-amber mb-2">
          ⚠️ {affectedNames.length} paciente{affectedNames.length !== 1 ? 's' : ''} en este rango
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={onContinue}
          disabled={!validRange}
          className={`flex-1 inline-flex items-center justify-center px-3 py-1.5 rounded-md text-xs cursor-pointer border transition-colors ${
            !validRange
              ? 'border-gray-border bg-gray-bg text-text-hint cursor-not-allowed'
              : 'border-primary bg-primary text-white hover:bg-[#534AB7]'
          }`}
        >
          Continuar
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs cursor-pointer border border-gray-border bg-white text-text-muted hover:bg-gray-bg transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
