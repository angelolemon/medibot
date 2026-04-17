import type { Appointment } from '../../data/appointments'

interface Props {
  appointments: Appointment[]
}

export default function StatsGrid({ appointments }: Props) {
  const total = appointments.length
  const confirmados = appointments.filter((a) => a.status === 'confirmado').length
  const pendientes = appointments.filter((a) => a.status === 'pendiente').length
  const cancelados = appointments.filter((a) => a.status === 'cancelado').length

  const stats = [
    { label: 'Total', value: total, dot: 'bg-text-hint' },
    { label: 'Confirmados', value: confirmados, dot: 'bg-teal' },
    { label: 'Pendientes', value: pendientes, dot: 'bg-[#EF9F27]' },
    { label: 'Cancelados', value: cancelados, dot: 'bg-coral' },
  ]

  return (
    <div className="bg-white border border-gray-border rounded-[10px] overflow-hidden mb-4 grid grid-cols-4 divide-x divide-gray-border">
      {stats.map((s) => (
        <div key={s.label} className="px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            <span className="text-[10px] text-text-hint uppercase tracking-wide">{s.label}</span>
          </div>
          <div className="text-[20px] font-semibold text-text leading-none">{s.value}</div>
        </div>
      ))}
    </div>
  )
}
