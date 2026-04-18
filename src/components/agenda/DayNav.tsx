import type { DayOption } from '../../data/appointments'

interface Props {
  days: DayOption[]
  selectedDate: string
  blockedDates: Set<string>
  onSelect: (date: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  appointmentCounts?: Record<string, number>
}

const dowNames = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB']

export default function DayNav({ days, selectedDate, blockedDates, onSelect, onPrevWeek, onNextWeek, appointmentCounts }: Props) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[10px] text-text-hint uppercase tracking-[0.12em]" style={{ fontFamily: 'var(--font-mono)' }}>
          Semana
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onPrevWeek}
            className="w-7 h-7 rounded-full border border-gray-border bg-surface text-text-hint hover:bg-surface-2 cursor-pointer text-xs grid place-items-center"
          >
            ‹
          </button>
          <button
            onClick={onNextWeek}
            className="w-7 h-7 rounded-full border border-gray-border bg-surface text-text-hint hover:bg-surface-2 cursor-pointer text-xs grid place-items-center"
          >
            ›
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((d) => {
          const dObj = new Date(d.date + 'T12:00:00')
          const dayNum = dObj.getDate()
          const dow = dowNames[dObj.getDay()]
          const isBlocked = blockedDates.has(d.date)
          const isSelected = selectedDate === d.date
          const count = appointmentCounts?.[d.date]

          return (
            <button
              key={d.date}
              onClick={() => onSelect(d.date)}
              className={`text-left px-3.5 py-3 rounded-[10px] cursor-pointer border transition-colors ${
                isSelected
                  ? 'bg-text text-surface border-text'
                  : isBlocked
                    ? 'bg-coral-light border-coral-light text-coral'
                    : d.isToday
                      ? 'bg-primary-light border-primary-mid text-primary'
                      : 'bg-surface border-gray-border text-text hover:bg-surface-2'
              }`}
            >
              <div className={`text-[10px] uppercase tracking-[0.1em] ${isSelected ? 'opacity-60' : 'opacity-70'}`}>
                {dow}
              </div>
              <div
                className="text-[22px] mt-0.5 tracking-[-0.02em] leading-[1.05]"
                style={{ fontFamily: 'var(--font-serif)' }}
              >
                {dayNum}
              </div>
              {count != null && count > 0 && (
                <div className={`text-[10px] mt-1 ${isSelected ? 'opacity-65' : 'opacity-65'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                  {count} {count === 1 ? 'turno' : 'turnos'}
                </div>
              )}
              {isBlocked && !isSelected && (
                <div className="text-[10px] mt-1 opacity-75" style={{ fontFamily: 'var(--font-mono)' }}>
                  bloqueado
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
