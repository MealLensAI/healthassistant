import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { useMealTracking } from '@/hooks/useMealTracking';

interface WeekProgressBarProps {
  mealPlanId: string | null;
  className?: string;
}

const WeekProgressBar: React.FC<WeekProgressBarProps> = ({ mealPlanId, className = '' }) => {
  const { progress, loading } = useMealTracking(mealPlanId);
  
  if (!mealPlanId || loading || !progress) {
    return null;
  }
  
  const { total_meals, cooked_meals, progress_percentage, is_complete } = progress;
  
  return (
    <div className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {is_complete ? (
            <Trophy className="w-5 h-5 text-yellow-500" />
          ) : (
            <TrendingUp className="w-5 h-5 text-blue-500" />
          )}
          <span className="font-semibold text-gray-800">
            {is_complete ? 'Week Complete!' : 'Weekly Progress'}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-600">
          {cooked_meals} / {total_meals} meals
        </span>
      </div>
      
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
            is_complete 
              ? 'bg-gradient-to-r from-yellow-400 to-green-500' 
              : 'bg-gradient-to-r from-blue-400 to-green-500'
          }`}
          style={{ width: `${progress_percentage}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>0%</span>
        <span className={`font-medium ${is_complete ? 'text-green-600' : 'text-blue-600'}`}>
          {progress_percentage.toFixed(0)}%
        </span>
        <span>100%</span>
      </div>
      
      {is_complete && (
        <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800 font-medium text-center">
            Congratulations! You've completed all your meals this week!
          </p>
        </div>
      )}
    </div>
  );
};

export default WeekProgressBar;
