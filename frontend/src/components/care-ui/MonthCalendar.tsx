import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

function isoDate(year: number, month: number, day: number) {
  const date = new Date(year, month, day, 12, 0, 0)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayIso() {
  const now = new Date()
  return isoDate(now.getFullYear(), now.getMonth(), now.getDate())
}

export function MonthCalendar({
  selected,
  onSelect,
  markedDates = [],
  minDate,
}: {
  selected: string
  onSelect: (iso: string) => void
  markedDates?: string[]
  minDate?: string
}) {
  const selectedDate = selected ? new Date(`${selected}T12:00:00`) : new Date()
  const [cursor, setCursor] = useState({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() })
  const floor = minDate || todayIso()
  const marked = useMemo(() => new Set(markedDates), [markedDates])

  const cells = useMemo(() => {
    const first = new Date(cursor.year, cursor.month, 1)
    const startPad = first.getDay()
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
    const items: { iso: string; day: number; inMonth: boolean }[] = []
    for (let i = 0; i < startPad; i += 1) {
      items.push({ iso: '', day: 0, inMonth: false })
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ iso: isoDate(cursor.year, cursor.month, day), day, inMonth: true })
    }
    return items
  }, [cursor])

  const label = new Date(cursor.year, cursor.month, 1).toLocaleDateString([], { month: 'long', year: 'numeric' })

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-panel"
          aria-label="Previous month"
          onClick={() =>
            setCursor((current) =>
              current.month === 0 ? { year: current.year - 1, month: 11 } : { year: current.year, month: current.month - 1 },
            )
          }
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold text-ink">{label}</p>
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-panel"
          aria-label="Next month"
          onClick={() =>
            setCursor((current) =>
              current.month === 11 ? { year: current.year + 1, month: 0 } : { year: current.year, month: current.month + 1 },
            )
          }
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell.inMonth) return <span key={`pad-${index}`} />
          const disabled = cell.iso < floor
          const selectedDay = cell.iso === selected
          const markedDay = marked.has(cell.iso)
          return (
            <button
              key={cell.iso}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(cell.iso)}
              className={`relative h-9 rounded-lg text-sm font-semibold ${
                disabled
                  ? 'cursor-not-allowed text-muted/40'
                  : selectedDay
                    ? 'bg-[#0E3E77] text-white'
                    : 'text-ink hover:bg-navy-soft'
              }`}
            >
              {cell.day}
              {markedDay ? (
                <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${selectedDay ? 'bg-white' : 'bg-navy'}`} />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
