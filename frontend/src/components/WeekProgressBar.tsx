import React from 'react';

interface WeekProgress {
  total_meals: number;
  cooked_meals: number;
  progress_percentage: number;
  is_complete: boolean;
}

interface WeekProgressBarProps {
  mealPlanId: string | null;
  progress: WeekProgress | null;
  loading?: boolean;
  className?: string;
}

const WeekProgressBar: React.FC<WeekProgressBarProps> = ({ mealPlanId, progress, loading = false, className = '' }) => {
  if (!mealPlanId || loading || !progress) {
    return null;
  }
  
  const { total_meals, cooked_meals, progress_percentage, is_complete } = progress;
  
  return (
    <div className={`bg-card rounded-2xl p-4 shadow-soft border border-border ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-foreground">
          {is_complete ? 'Week complete' : 'Weekly progress'}
        </span>
        <span className="text-sm font-medium text-muted-foreground">
          {cooked_meals} / {total_meals} meals
        </span>
      </div>
      
      <div className="relative h-2.5 bg-secondary rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
            is_complete ? 'bg-leaf' : 'bg-primary'
          }`}
          style={{ width: `${progress_percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-muted-foreground">
        <span>0%</span>
        <span className={`font-medium ${is_complete ? 'text-leaf' : 'text-primary'}`}>
          {progress_percentage.toFixed(0)}%
        </span>
        <span>100%</span>
      </div>
      
      {is_complete && (
        <div className="mt-3 p-3 bg-leaf-soft rounded-xl border border-leaf/15">
          <p className="text-sm text-foreground font-medium text-center">
            Nice work. You cooked every meal this week.
          </p>
        </div>
      )}
    </div>
  );
};

export default WeekProgressBar;
