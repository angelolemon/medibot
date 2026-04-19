import type { Patient } from '../../data/appointments'
import Icon from '../Icon'
import Btn from '../Btn'

interface Props {
  patient: Patient | null
  onScheduleAppointment?: (patient: Patient) => void
}

export default function PatientDetailPanel({ patient, onScheduleAppointment }: Props) {
  if (!patient) {
    return (
      <Panel>
        <div className="p-5 flex-1">
          <Eyebrow>Detalle del paciente</Eyebrow>
          <p className="text-[13px] text-text-hint mt-4 leading-[1.55]">
            Seleccioná un paciente de la lista para ver su información.
          </p>
        </div>
      </Panel>
    )
  }

  const waHref = (() => {
    const phone = patient.phone?.replace(/[^\d]/g, '') || ''
    if (!phone) return null
    const normalized = phone.startsWith('54')
      ? phone
      : `549${phone.replace(/^0/, '').replace(/^15/, '')}`
    return `https://wa.me/${normalized}`
  })()

  return (
    <Panel>
      <div className="p-5 flex-1 overflow-y-auto scrollbar-hide">
        {/* Patient header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div
            className="w-[52px] h-[52px] rounded-full bg-primary-light text-primary grid place-items-center text-[18px] shrink-0"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            {patient.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div
              className="text-[20px] tracking-[-0.02em] leading-[1.15] text-text"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {patient.name}
            </div>
            <div
              className="text-[11px] text-text-hint mt-[3px]"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {patient.age || '—'}{patient.since && ` · desde ${patient.since}`}
            </div>
          </div>
        </div>

        {/* Info pills */}
        <div className="grid grid-cols-2 gap-2 mb-[18px]">
          <InfoPill label="Obra social" value={patient.insurance || '—'} />
          <InfoPill label="Sesiones" value={String(patient.totalSessions ?? 0)} />
        </div>

        {/* Last visit */}
        {patient.lastVisit && (
          <div className="p-[14px] bg-surface-2 border border-gray-border rounded-[10px] mb-[18px]">
            <Eyebrow>Última visita</Eyebrow>
            <div
              className="text-[16px] mt-1 tracking-[-0.015em] text-text"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              {patient.lastVisit}
            </div>
          </div>
        )}

        {/* Contact */}
        {(patient.phone || patient.email) && (
          <div className="mb-[18px]">
            <Eyebrow style={{ marginBottom: 8 }}>Contacto</Eyebrow>
            <div className="text-[12px] text-text-muted leading-[1.7]">
              {patient.phone && (
                <div className="flex items-center gap-2">
                  <Icon name="phone" size={12} style={{ color: 'var(--color-text-hint)' }} />
                  {patient.phone}
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-2">
                  <Icon name="email" size={12} style={{ color: 'var(--color-text-hint)' }} />
                  {patient.email}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        {patient.tags.length > 0 && (
          <div className="mb-[18px]">
            <Eyebrow style={{ marginBottom: 8 }}>Etiquetas</Eyebrow>
            <div className="flex flex-wrap gap-1.5">
              {patient.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block text-[11px] px-[9px] py-[2px] rounded-full bg-primary-light text-primary font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <Eyebrow style={{ marginBottom: 10 }}>
            Historial · {patient.history.length}
          </Eyebrow>
          {patient.history.length === 0 ? (
            <div className="text-xs text-text-hint">Sin historial previo</div>
          ) : (
            patient.history.map((h, i) => (
              <div
                key={i}
                className={`py-[10px] ${i > 0 ? 'border-t border-gray-border' : ''}`}
              >
                <div
                  className="text-[10px] text-text-hint"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {h.date}
                </div>
                <div className="text-[12px] text-text-muted mt-1 leading-[1.55]">{h.text}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-border flex flex-col gap-2 shrink-0">
        {onScheduleAppointment && (
          <Btn
            variant="primary"
            onClick={() => onScheduleAppointment(patient)}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            <Icon name="plus" size={13} /> Agendar turno
          </Btn>
        )}
        {waHref ? (
          <a
            href={waHref}
            target="_blank"
            rel="noopener"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-[8px] px-3 py-[9px] text-[12px] font-medium cursor-pointer bg-surface text-text-muted border border-gray-border-2 hover:bg-surface-2 transition-colors"
          >
            <Icon name="chat" size={13} /> Abrir WhatsApp
          </a>
        ) : (
          <Btn disabled style={{ width: '100%', justifyContent: 'center' }}>
            <Icon name="chat" size={13} /> Sin teléfono
          </Btn>
        )}
      </div>
    </Panel>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="hidden lg:flex w-[300px] bg-surface border-l border-gray-border flex-col shrink-0 h-full">
      {children}
    </div>
  )
}

function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="text-[10px] text-text-hint uppercase tracking-[0.12em]"
      style={{ fontFamily: 'var(--font-mono)', ...style }}
    >
      {children}
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-2.5 bg-surface-2 border border-gray-border rounded-[10px]">
      <Eyebrow>{label}</Eyebrow>
      <div
        className="text-[15px] mt-[3px] text-text tracking-[-0.01em]"
        style={{ fontFamily: 'var(--font-serif)' }}
      >
        {value}
      </div>
    </div>
  )
}
