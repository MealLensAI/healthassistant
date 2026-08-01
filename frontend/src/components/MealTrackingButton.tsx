import React, { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useMealTracking } from '@/hooks/useMealTracking';

interface MealTrackingButtonProps {
  mealPlanId: string | null;
  day: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MealTrackingButton: React.FC<MealTrackingButtonProps> = ({
  mealPlanId,
  day,
  mealType,
  size = 'md',
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { isMealCooked, markAsCooked, unmarkAsCooked } = useMealTracking(mealPlanId);

  const isCooked = isMealCooked(day, mealType);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!mealPlanId || isLoading) return;

    setIsLoading(true);
    try {
      if (isCooked) {
        await unmarkAsCooked(day, mealType);
      } else {
        await markAsCooked(day, mealType);
      }
    } catch (err) {
      console.error('[MealTrackingButton] toggle failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading || !mealPlanId}
      className={`
        inline-flex items-center justify-center rounded-full font-medium
        transition-all duration-200
        ${sizeClasses[size]}
        ${isCooked
          ? 'bg-leaf text-white'
          : 'bg-card text-muted-foreground hover:text-leaf border border-border'
        }
        ${isLoading ? 'opacity-70 cursor-wait' : 'cursor-pointer'}
        ${!mealPlanId ? 'opacity-40 cursor-not-allowed' : ''}
        ${className}
      `}
      title={isCooked ? 'Click to unmark as cooked' : 'Click to mark as cooked'}
    >
      {isLoading ? (
        <Loader2 className={`${iconSizes[size]} animate-spin`} />
      ) : isCooked ? (
        <Check className={iconSizes[size]} />
      ) : null}
      <span>{isCooked ? 'Cooked' : 'Mark cooked'}</span>
    </button>
  );
};

export default MealTrackingButton;
