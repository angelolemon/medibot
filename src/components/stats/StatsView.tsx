import type { Appointment, Patient } from '../../data/appointments'

interface Props {
  appointments: Appointment[]
  patients: Patient[]
}

export default function StatsView({ appointments, patients }: Props) {
  // General stats
  const totalPatients = patients.length
  const newPatients = patients.filter((p) => p.totalSessions === 0).length
  const totalSessions = patients.reduce((sum, p) => sum + p.totalSessions, 0)
  const avgSessionsPerPatient = totalPatients > 0 ? Math.round(totalSessions / totalPatients) : 0

  // This month (April)
  const thisMonthAll = appointments.filter((a) => a.date.startsWith('2026-04'))
  const thisMonthAppts = thisMonthAll.filter((a) => a.status !== 'libre' && a.status !== 'bloqueado')
  const thisMonthTotal = thisMonthAppts.length
  const thisMonthConfirmed = thisMonthAppts.filter((a) => a.status === 'confirmado').length
  const thisMonthSlots = thisMonthAll.length
  const thisMonthOccupancy = thisMonthSlots > 0 ? Math.round((thisMonthAppts.length / thisMonthSlots) * 100) : 0

  // This week (29 mar - 4 abr)
  const thisWeekDates = ['2026-03-29', '2026-03-30', '2026-03-31', '2026-04-01', '2026-04-02', '2026-04-03', '2026-04-04']
  const thisWeekAppts = appointments.filter((a) => thisWeekDates.includes(a.date) && a.status !== 'libre' && a.status !== 'bloqueado')
  const thisWeekConfirmed = thisWeekAppts.filter((a) => a.status === 'confirmado').length
  const thisWeekCancelled = thisWeekAppts.filter((a) => a.status === 'cancelado').length
  const thisWeekPending = thisWeekAppts.filter((a) => a.status === 'pendiente').length
  const thisWeekTotal = thisWeekAppts.length

  // Next week (5 - 11 abr)
  const nextWeekDates = ['2026-04-05', '2026-04-06', '2026-04-07', '2026-04-08', '2026-04-09', '2026-04-10', '2026-04-11']
  const nextWeekAppts = appointments.filter((a) => nextWeekDates.includes(a.date) && a.status !== 'libre' && a.status !== 'bloqueado')
  const nextWeekTotal = nextWeekAppts.length

  // Cancel rate
  const allWithPatient = appointments.filter((a) => a.status !== 'libre' && a.status !== 'bloqueado')
  const allCancelled = allWithPatient.filter((a) => a.status === 'cancelado').length
  const cancelRate = allWithPatient.length > 0 ? Math.round((allCancelled / allWithPatient.length) * 100) : 0

  // Insurance breakdown
  const insuranceCounts: Record<string, number> = {}
  for (const p of patients) {
    insuranceCounts[p.insurance] = (insuranceCounts[p.insurance] ?? 0) + 1
  }
  const insuranceSorted = Object.entries(insuranceCounts).sort((a, b) => b[1] - a[1])

  // Frequency breakdown
  const frequencyCounts: Record<string, number> = {}
  for (const p of patients) {
    for (const tag of p.tags) {
      if (['Semanal', 'Quincenal', 'Mensual'].includes(tag)) {
        frequencyCounts[tag] = (frequencyCounts[tag] ?? 0) + 1
      }
    }
  }

  // Top patients by sessions
  const topPatients = [...patients].sort((a, b) => b.totalSessions - a.totalSessions).slice(0, 5)

  // Appointments by day of week
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const apptsByDay = [0, 0, 0, 0, 0, 0, 0]
  for (const a of appointments) {
    if (a.status !== 'libre' && a.status !== 'bloqueado') {
      const d = new Date(a.date + 'T12:00:00')
      apptsByDay[d.getDay()]++
    }
  }
  const maxDayCount = Math.max(...apptsByDay, 1)

  // Tags overview
  const tagCounts: Record<string, number> = {}
  for (const p of patients) {
    for (const tag of p.tags) {
      if (!['Semanal', 'Quincenal', 'Mensual', 'Primera vez'].includes(tag)) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
      }
    }
  }
  const tagsSorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-bg">
      <div className="p-6 sm:p-8 overflow-y-auto flex-1 pb-20 lg:pb-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
          <div>
            <h1 className="text-[36px] sm:text-[44px] font-bold text-text leading-[1.05] tracking-tight">Estadísticas</h1>
            <p className="text-[14px] text-text-muted mt-2">Resumen de tu práctica profesional.</p>
          </div>
        </div>
        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <KpiCard
            label="Ocupación del mes"
            value={`${thisMonthOccupancy}%`}
            icon="📈"
            accent={thisMonthOccupancy >= 70 ? 'teal' : undefined}
            sub={`${thisMonthAppts.length} turnos asignados de ${thisMonthSlots} disponibles`}
          />
          <KpiCard
            label="Turnos este mes"
            value={String(thisMonthTotal)}
            icon="📅"
            sub={`${thisMonthConfirmed} confirmados de ${thisMonthTotal}`}
          />
          <KpiCard
            label="Sesiones históricas"
            value={String(totalSessions)}
            icon="📋"
            sub={`${avgSessionsPerPatient} promedio por paciente`}
          />
          <KpiCard
            label="Tasa de cancelación"
            value={`${cancelRate}%`}
            icon="📉"
            accent={cancelRate > 15 ? 'coral' : 'teal'}
            sub={cancelRate <= 15 ? 'Dentro del rango normal' : 'Por encima del promedio'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* This week summary */}
          <div className="bg-white border border-gray-border rounded-[16px] p-5">
            <div className="text-[13px] font-semibold mb-4">Esta semana</div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MiniStat label="Turnos" value={thisWeekTotal} />
              <MiniStat label="Confirmados" value={thisWeekConfirmed} color="text-teal" />
              <MiniStat label="Cancelados" value={thisWeekCancelled} color="text-coral" />
            </div>
            {thisWeekPending > 0 && (
              <div className="flex items-center gap-2 bg-amber-light rounded-md px-3 py-2">
                <span className="text-sm">⚠️</span>
                <span className="text-xs text-amber">{thisWeekPending} turno{thisWeekPending !== 1 ? 's' : ''} pendiente{thisWeekPending !== 1 ? 's' : ''} de confirmar</span>
              </div>
            )}
          </div>

          {/* Next week preview */}
          <div className="bg-white border border-gray-border rounded-[16px] p-5">
            <div className="text-[13px] font-semibold mb-4">Próxima semana</div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MiniStat label="Turnos" value={nextWeekTotal} />
              <MiniStat label="Pendientes" value={nextWeekAppts.filter(a => a.status === 'pendiente').length} color="text-amber" />
              <MiniStat label="Confirmados" value={nextWeekAppts.filter(a => a.status === 'confirmado').length} color="text-teal" />
            </div>
            <div className="text-xs text-text-hint">
              {nextWeekTotal > thisWeekTotal ? `↑ ${nextWeekTotal - thisWeekTotal} turnos más que esta semana` :
               nextWeekTotal < thisWeekTotal ? `↓ ${thisWeekTotal - nextWeekTotal} turnos menos que esta semana` :
               'Misma carga que esta semana'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* Appointments by day */}
          <div className="bg-white border border-gray-border rounded-[16px] p-5">
            <div className="text-[13px] font-semibold mb-4">Turnos por día de la semana</div>
            <div className="space-y-2">
              {dayNames.map((name, i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-text-muted w-8">{name}</span>
                  <div className="flex-1 h-5 bg-gray-bg rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(apptsByDay[i] / maxDayCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-text w-6 text-right">{apptsByDay[i]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Insurance breakdown */}
          <div className="bg-white border border-gray-border rounded-[16px] p-5">
            <div className="text-[13px] font-semibold mb-4">Obras sociales</div>
            <div className="space-y-2.5">
              {insuranceSorted.map(([name, count]) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-block text-[11px] font-medium px-2 py-px rounded-full ${
                      name === 'Particular' ? 'bg-amber-light text-amber' : 'bg-teal-light text-teal'
                    }`}>
                      {name}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">{count} paciente{count !== 1 ? 's' : ''}</div>
                </div>
              ))}
            </div>
            {/* Frequency */}
            <div className="mt-5 pt-4 border-t border-gray-border">
              <div className="text-[11px] text-text-hint uppercase tracking-wide mb-2">Frecuencia de sesiones</div>
              <div className="flex gap-3">
                {Object.entries(frequencyCounts).map(([freq, count]) => (
                  <div key={freq} className="text-center">
                    <div className="text-lg font-semibold text-text">{count}</div>
                    <div className="text-[10px] text-text-hint">{freq}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top patients */}
          <div className="bg-white border border-gray-border rounded-[16px] p-5">
            <div className="text-[13px] font-semibold mb-4">Pacientes con más sesiones</div>
            <div className="space-y-2">
              {topPatients.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3 py-1.5">
                  <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center text-[10px] font-semibold text-primary shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{p.name}</div>
                    <div className="text-[10px] text-text-hint">{p.since}</div>
                  </div>
                  <div className="text-sm font-semibold text-primary">{p.totalSessions}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pathology tags */}
          <div className="bg-white border border-gray-border rounded-[16px] p-5">
            <div className="text-[13px] font-semibold mb-4">Motivos de consulta</div>
            <div className="flex flex-wrap gap-2">
              {tagsSorted.map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-1.5 bg-primary-light rounded-full px-3 py-1.5">
                  <span className="text-xs font-medium text-primary">{tag}</span>
                  <span className="text-[10px] text-primary/60 font-semibold">{count}</span>
                </div>
              ))}
            </div>
            {tagsSorted.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-border">
                <div className="text-xs text-text-hint">
                  Motivo más frecuente: <span className="font-medium text-text">{tagsSorted[0][0]}</span> ({tagsSorted[0][1]} pacientes)
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, accent, sub }: { label: string; value: string; icon: string; accent?: 'coral' | 'teal'; sub?: string }) {
  return (
    <div className="bg-white border border-gray-border rounded-[16px] px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl font-semibold ${accent === 'coral' ? 'text-coral' : accent === 'teal' ? 'text-teal' : 'text-text'}`}>{value}</div>
      <div className="text-[11px] text-text-hint uppercase tracking-wide mt-1">{label}</div>
      {sub && <div className="text-[11px] text-text-muted mt-1.5">{sub}</div>}
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <div className={`text-xl font-semibold ${color ?? 'text-text'}`}>{value}</div>
      <div className="text-[10px] text-text-hint uppercase tracking-wide">{label}</div>
    </div>
  )
}
