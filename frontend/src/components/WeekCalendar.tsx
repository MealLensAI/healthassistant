import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  className?: string;
}

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfWeekMonday = (date: Date) => {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const WeekCalendar: React.FC<WeekCalendarProps> = ({
  selectedDate,
  onSelectDate,
  className = '',
}) => {
  const [viewMonth, setViewMonth] = useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const weekStart = useMemo(() => startOfWeekMonday(selectedDate), [selectedDate]);
  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const days = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const gridStart = startOfWeekMonday(firstOfMonth);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const inSelectedWeek = (date: Date) => {
    const t = startOfDay(date).getTime();
    return t >= weekStart.getTime() && t <= weekEnd.getTime();
  };

  return (
    <div className={`rounded-2xl border border-border bg-background p-3 sm:p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
        <button
          type="button"
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div
            key={d}
            className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((date) => {
          const outside = date.getMonth() !== viewMonth.getMonth();
          const selected = isSameDay(date, selectedDate);
          const inWeek = inSelectedWeek(date);
          const today = isSameDay(date, new Date());

          return (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`
                h-9 sm:h-10 rounded-lg text-sm font-medium transition-colors
                ${outside ? 'text-muted-foreground/40' : 'text-foreground'}
                ${inWeek && !selected ? 'bg-primary/10' : ''}
                ${selected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'}
                ${today && !selected ? 'ring-1 ring-primary/40' : ''}
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-3 text-center">
        Week of{' '}
        {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        {' – '}
        {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
};

export default WeekCalendar;
