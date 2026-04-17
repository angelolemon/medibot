import type { Patient } from '../../data/appointments'

interface Props {
  patient: Patient | null
}

export default function PatientDetailPanel({ patient }: Props) {
  if (!patient) {
    return (
      <div className="hidden lg:flex w-[280px] bg-white border-l border-gray-border flex-col shrink-0 h-full">
        <div className="px-[18px] pt-5 pb-4 border-b border-gray-border">
          <div className="text-[15px] font-semibold">Detalle del paciente</div>
        </div>
        <div className="px-[18px] py-4 flex-1">
          <p className="text-[13px] text-[#bbb] mt-5">
            Seleccioná un paciente de la lista para ver su información.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden lg:flex w-[280px] bg-white border-l border-gray-border flex-col shrink-0 h-full">
      {/* Header */}
      <div className="px-[18px] pt-5 pb-4 border-b border-gray-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-[15px] font-semibold text-primary shrink-0">
            {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div className="text-[15px] font-semibold">{patient.name}</div>
            <div className="text-[11px] text-text-hint">{patient.age}</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-[18px] py-4 flex-1 overflow-y-auto">
        <Field label="Obra social" value={patient.insurance} />
        <Field label="Teléfono" value={patient.phone} isLink />
        <Field label="Email" value={patient.email} isLink />
        <Field label="Vínculo" value={patient.since} />
        <Field label="Última visita" value={patient.lastVisit} />
        <Field label="Total de sesiones" value={String(patient.totalSessions)} />

        <div className="mb-3.5">
          <div className="text-[11px] text-text-hint uppercase tracking-wide mb-1">Etiquetas</div>
          <div className="flex flex-wrap gap-1">
            {patient.tags.map((tag) => (
              <span key={tag} className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-primary-light text-primary">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mb-3.5">
          <div className="text-[11px] text-text-hint uppercase tracking-wide mb-2">
            Últimas sesiones
          </div>
          {patient.history.length === 0 ? (
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

      {/* Footer */}
      <div className="px-[18px] py-3.5 border-t border-gray-border flex flex-col gap-2 shrink-0">
        <button
          onClick={() => alert(`Enviando mensaje por WhatsApp a ${patient.name}...`)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] cursor-pointer border border-primary bg-primary text-white hover:bg-[#534AB7] transition-colors"
        >
          💬 Enviar mensaje
        </button>
        <button
          onClick={() => alert(`Agendando turno para ${patient.name}...`)}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-[7px] rounded-md text-[13px] cursor-pointer border border-gray-border bg-white text-text hover:bg-gray-bg transition-colors"
        >
          📅 Agendar turno
        </button>
      </div>
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
