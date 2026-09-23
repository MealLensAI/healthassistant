import React from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface WeekSelectorProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  weekDates: { startDate: string; endDate: string; name: string };
  onWeekChange?: () => void;
}

const WeekSelector: React.FC<WeekSelectorProps> = ({ 
  selectedDate, 
  onDateChange, 
  weekDates,
  onWeekChange 
}) => {
  const handlePreviousWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 7);
    onDateChange(newDate);
    onWeekChange?.();
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 7);
    onDateChange(newDate);
    onWeekChange?.();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e2e8f0]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary" />
          <div>
            <h3 className="font-semibold text-[#2D3436]">Week of {formatDateRange(weekDates.startDate, weekDates.endDate)}</h3>
            <p className="text-sm text-[#1e293b]">
              {selectedDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-5 h-5 text-[#2D3436]" />
          </button>
          
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-5 h-5 text-[#2D3436]" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default WeekSelector; 