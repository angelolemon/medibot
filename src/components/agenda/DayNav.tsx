import type { DayOption } from '../../data/appointments'

interface Props {
  days: DayOption[]
  selectedDate: string
  blockedDates: Set<string>
  onSelect: (date: string) => void
  onPrevWeek: () => void
  onNextWeek: () => void
}

export default function DayNav({ days, selectedDate, blockedDates, onSelect, onPrevWeek, onNextWeek }: Props) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <button
        onClick={onPrevWeek}
        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-border bg-white text-text-muted hover:bg-gray-bg cursor-pointer text-xs shrink-0"
      >
        ‹
      </button>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1">
        {days.map((d) => {
          const isBlocked = blockedDates.has(d.date)
          const isSelected = selectedDate === d.date
          return (
            <button
              key={d.date}
              onClick={() => onSelect(d.date)}
              className={`px-3 py-1.5 rounded-full text-xs cursor-pointer border whitespace-nowrap transition-colors flex-1 min-w-0 relative ${
                isSelected
                  ? isBlocked
                    ? 'bg-coral text-white border-coral font-medium'
                    : 'bg-primary text-white border-primary font-medium'
                  : isBlocked
                    ? 'bg-coral-light text-coral border-coral-light line-through opacity-70'
                    : d.isToday
                      ? 'bg-primary-light text-primary border-primary-mid font-medium'
                      : 'bg-white text-text-muted border-gray-border hover:bg-gray-bg'
              }`}
              title={isBlocked ? 'Bloqueado' : undefined}
            >
              {d.label}
            </button>
          )
        })}
      </div>
      <button
        onClick={onNextWeek}
        className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-border bg-white text-text-muted hover:bg-gray-bg cursor-pointer text-xs shrink-0"
      >
        ›
      </button>
    </div>
  )
}
