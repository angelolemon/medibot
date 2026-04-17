import { useMemo } from 'react'
import type { Appointment } from '../../data/appointments'

interface Props {
  appointments: Appointment[]
  blockedDates: Set<string>
  currentMonth: number // 0-indexed
  currentYear: number
  selectedDate: string
  onSelectDay: (date: string) => void
  onPrevMonth: () => void
  onNextMonth: () => void
}

const dayHeaders = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const TODAY = '2026-04-04'

export default function MonthCalendar({ appointments, blockedDates, currentMonth, currentYear, selectedDate, onSelectDay, onPrevMonth, onNextMonth }: Props) {
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1)
    const startDow = firstDay.getDay()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = []

    // Previous month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate()
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      const m = currentMonth === 0 ? 11 : currentMonth - 1
      const y = currentMonth === 0 ? currentYear - 1 : currentYear
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date: iso, day: d, isCurrentMonth: false })
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date: iso, day: d, isCurrentMonth: true })
    }

    // Next month padding
    const remaining = 42 - days.length
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1
      const y = currentMonth === 11 ? currentYear + 1 : currentYear
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      days.push({ date: iso, day: d, isCurrentMonth: false })
    }

    return days
  }, [currentMonth, currentYear])

  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const apt of appointments) {
      const list = map.get(apt.date) ?? []
      list.push(apt)
      map.set(apt.date, list)
    }
    return map
  }, [appointments])

  return (
    <div>
      {/* Month header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-border bg-white text-text-muted hover:bg-gray-bg cursor-pointer text-sm"
        >
          ‹
        </button>
        <div className="text-[15px] font-semibold">
          {monthNames[currentMonth]} {currentYear}
        </div>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-border bg-white text-text-muted hover:bg-gray-bg cursor-pointer text-sm"
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px mb-1">
        {dayHeaders.map((d) => (
          <div key={d} className="text-[11px] text-text-hint uppercase tracking-wide text-center py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((cell) => {
          const isToday = cell.date === TODAY
          const isSelected = cell.date === selectedDate
          const isBlocked = blockedDates.has(cell.date)
          const dayAppts = appointmentsByDate.get(cell.date) ?? []
          const total = dayAppts.length
          const confirmados = dayAppts.filter((a) => a.status === 'confirmado').length
          const pendientes = dayAppts.filter((a) => a.status === 'pendiente').length
          const cancelados = dayAppts.filter((a) => a.status === 'cancelado').length

          return (
            <button
              key={cell.date}
              onClick={() => onSelectDay(cell.date)}
              className={`rounded-lg border p-1.5 text-left cursor-pointer transition-colors min-h-[72px] flex flex-col ${
                !cell.isCurrentMonth
                  ? 'opacity-40 border-transparent'
                  : isSelected
                    ? isBlocked
                      ? 'border-coral bg-coral-light ring-1 ring-coral'
                      : 'border-primary bg-primary-light ring-1 ring-primary'
                    : isBlocked
                      ? 'border-coral/20 bg-coral-light/50 hover:bg-coral-light'
                      : 'border-gray-border bg-white hover:bg-gray-bg'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className={`text-xs font-medium ${
                  isSelected ? (isBlocked ? 'text-coral' : 'text-primary') : isBlocked ? 'text-coral' : 'text-text'
                }`}>
                  {cell.day}
                </span>
                {isToday && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </div>
              {isBlocked && cell.isCurrentMonth && (
                <div className="text-[9px] text-coral font-medium">🏖️ Bloq.</div>
              )}

              {!isBlocked && total > 0 && cell.isCurrentMonth && (
                <div className="flex flex-col gap-0.5 mt-auto">
                  <div className="text-[10px] text-text-muted font-medium">{total} turno{total !== 1 ? 's' : ''}</div>
                  <div className="flex gap-0.5">
                    {confirmados > 0 && <div className="w-1.5 h-1.5 rounded-full bg-teal" title={`${confirmados} confirmados`} />}
                    {pendientes > 0 && <div className="w-1.5 h-1.5 rounded-full bg-[#EF9F27]" title={`${pendientes} pendientes`} />}
                    {cancelados > 0 && <div className="w-1.5 h-1.5 rounded-full bg-[#E24B4A]" title={`${cancelados} cancelados`} />}
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
