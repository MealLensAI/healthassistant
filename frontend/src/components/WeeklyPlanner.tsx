import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Flame, Drumstick, Wheat, Droplet, Check, ChefHat } from 'lucide-react';
import { useMealTracking } from '@/hooks/useMealTracking';

interface MealPlan {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snack: string;
  breakfast_ingredients?: string[];
  lunch_ingredients?: string[];
  dinner_ingredients?: string[];
  snack_ingredients?: string[];
  breakfast_name?: string;
  breakfast_calories?: number;
  breakfast_protein?: number;
  breakfast_carbs?: number;
  breakfast_fat?: number;
  breakfast_benefit?: string;
  breakfast_image?: string;
  lunch_name?: string;
  lunch_calories?: number;
  lunch_protein?: number;
  lunch_carbs?: number;
  lunch_fat?: number;
  lunch_benefit?: string;
  lunch_image?: string;
  dinner_name?: string;
  dinner_calories?: number;
  dinner_protein?: number;
  dinner_carbs?: number;
  dinner_fat?: number;
  dinner_benefit?: string;
  dinner_image?: string;
  snack_name?: string;
  snack_calories?: number;
  snack_protein?: number;
  snack_carbs?: number;
  snack_fat?: number;
  snack_benefit?: string;
  snack_image?: string;
}

interface WeeklyPlannerProps {
  selectedDay: string;
  onDaySelect: (day: string) => void;
  mealPlan?: MealPlan[];
  startDay?: string;
  mealPlanId?: string;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({ selectedDay, onDaySelect, mealPlan = [], startDay, mealPlanId }) => {
  const [foodImages, setFoodImages] = useState<Record<string, string>>({});
  const [cookingMeal, setCookingMeal] = useState<string | null>(null);
  
  const { 
    tracking, 
    progress, 
    markAsCooked, 
    unmarkAsCooked, 
    isMealCooked,
    loading: trackingLoading 
  } = useMealTracking(mealPlanId || null);

  // Helper function to extract clean food name from meal description
  const extractFoodName = (mealDescription: string): string => {
    return mealDescription.replace(/\s*\(buy:[^)]*\)/, '').trim();
  };

  // Fetch food image for a meal - use DB image if available, otherwise fetch
  const fetchFoodImage = async (foodName: string, storedImageUrl?: string) => {
    if (foodImages[foodName]) return; // Already in component state

    // If image is stored in DB, use it directly
    if (storedImageUrl) {
      setFoodImages(prev => ({ ...prev, [foodName]: storedImageUrl }));
      return;
    }

    // Otherwise fetch from cache/API
    try {
      const { imageCache } = await import('@/lib/imageCache');
      const fallback = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
      const cachedImage = await imageCache.getImage(foodName, fallback);
      setFoodImages(prev => ({ ...prev, [foodName]: cachedImage }));
    } catch (error) {
      console.error('Error fetching food image:', error);
      // Set fallback image on error
      const fallback = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
      setFoodImages(prev => ({ ...prev, [foodName]: fallback }));
    }
  };

  // Helper function to get meal preview for a day
  const getMealPreview = (day: string) => {
    const dayPlan = mealPlan.find(plan => plan.day === day);
    if (!dayPlan) return null;
    return {
      breakfast: {
        name: dayPlan.breakfast_name || extractFoodName(dayPlan.breakfast),
        calories: dayPlan.breakfast_calories,
        protein: dayPlan.breakfast_protein,
        carbs: dayPlan.breakfast_carbs,
        fat: dayPlan.breakfast_fat,
        benefit: dayPlan.breakfast_benefit,
        image: dayPlan.breakfast_image // Use stored image from DB
      },
      lunch: {
        name: dayPlan.lunch_name || extractFoodName(dayPlan.lunch),
        calories: dayPlan.lunch_calories,
        protein: dayPlan.lunch_protein,
        carbs: dayPlan.lunch_carbs,
        fat: dayPlan.lunch_fat,
        benefit: dayPlan.lunch_benefit,
        image: dayPlan.lunch_image // Use stored image from DB
      },
      dinner: {
        name: dayPlan.dinner_name || extractFoodName(dayPlan.dinner),
        calories: dayPlan.dinner_calories,
        protein: dayPlan.dinner_protein,
        carbs: dayPlan.dinner_carbs,
        fat: dayPlan.dinner_fat,
        benefit: dayPlan.dinner_benefit,
        image: dayPlan.dinner_image // Use stored image from DB
      },
      snack: dayPlan.snack ? {
        name: dayPlan.snack_name || extractFoodName(dayPlan.snack),
        calories: dayPlan.snack_calories,
        protein: dayPlan.snack_protein,
        carbs: dayPlan.snack_carbs,
        fat: dayPlan.snack_fat,
        benefit: dayPlan.snack_benefit,
        image: dayPlan.snack_image // Use stored image from DB
      } : null
    };
  };

  // State to store the visible days order, rotated only when startDay changes
  const [visibleDays, setVisibleDays] = useState<string[]>(days);
  // State to track which day is expanded (only one at a time)
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Rotate days only when startDay changes, and expand only startDay
  useEffect(() => {
    const start = startDay || days[0];
    const startIdx = days.indexOf(start);
    const rotated = startIdx === -1 ? days : [...days.slice(startIdx), ...days.slice(0, startIdx)];
    setVisibleDays(rotated);
    setExpandedDay(start); // Only expand the start day
  }, [startDay]);

  // When selectedDay changes, expand only that day
  useEffect(() => {
    setExpandedDay(selectedDay);
  }, [selectedDay]);

  // Fetch images for all meals when meal plan changes
  useEffect(() => {
    if (mealPlan.length > 0) {
      mealPlan.forEach(dayPlan => {
        if (dayPlan.breakfast_name) fetchFoodImage(dayPlan.breakfast_name, dayPlan.breakfast_image);
        if (dayPlan.lunch_name) fetchFoodImage(dayPlan.lunch_name, dayPlan.lunch_image);
        if (dayPlan.dinner_name) fetchFoodImage(dayPlan.dinner_name, dayPlan.dinner_image);
        if (dayPlan.snack_name) fetchFoodImage(dayPlan.snack_name, dayPlan.snack_image);
      });
    }
  }, [mealPlan]);

  const handleDayClick = (day: string) => {
    setExpandedDay(prev => (prev === day ? null : day));
    onDaySelect(day);
  };

  const handleCookToggle = async (day: string, mealType: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${day}-${mealType}`;
    setCookingMeal(key);
    
    try {
      if (isMealCooked(day, mealType)) {
        await unmarkAsCooked(day, mealType);
      } else {
        await markAsCooked(day, mealType);
      }
    } finally {
      setCookingMeal(null);
    }
  };

  const CookedButton: React.FC<{ day: string; mealType: string }> = ({ day, mealType }) => {
    const isCooked = isMealCooked(day, mealType);
    const key = `${day}-${mealType}`;
    const isLoading = cookingMeal === key;
    
    return (
      <button
        onClick={(e) => handleCookToggle(day, mealType, e)}
        disabled={isLoading || !mealPlanId}
        className={`
          flex items-center gap-1 px-2 py-1 rounded-full text-[9px] sm:text-xs font-medium
          transition-all duration-200 transform hover:scale-105
          ${isCooked 
            ? 'bg-green-500 text-white shadow-md' 
            : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-700 border border-gray-200'
          }
          ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
          ${!mealPlanId ? 'opacity-30 cursor-not-allowed' : ''}
        `}
        title={isCooked ? 'Click to unmark as cooked' : 'Click to mark as cooked'}
      >
        {isLoading ? (
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : isCooked ? (
          <Check className="w-3 h-3" />
        ) : (
          <ChefHat className="w-3 h-3" />
        )}
        <span>{isCooked ? 'Cooked' : 'Mark Cooked'}</span>
      </button>
    );
  };

  const getDayProgress = (day: string) => {
    const dayTracking = tracking[day] || {};
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    const dayPlan = mealPlan.find(p => p.day === day);
    
    if (!dayPlan) return { cooked: 0, total: 0 };
    
    let total = 0;
    let cooked = 0;
    
    mealTypes.forEach(type => {
      if (dayPlan[type as keyof MealPlan]) {
        total++;
        if (dayTracking[type]?.cooked_at) {
          cooked++;
        }
      }
    });
    
    return { cooked, total };
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-[#2D3436]">This Week</h3>
        {progress && mealPlanId && (
          <div className="flex items-center gap-2">
            <div className="w-20 sm:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-xs text-gray-600 font-medium">
              {progress.cooked_meals}/{progress.total_meals}
            </span>
          </div>
        )}
      </div>
      <div className="space-y-1">

        {visibleDays.map((day) => {
          const mealPreview = getMealPreview(day);
          const hasMeals = mealPlan.length > 0;
          const isExpanded = expandedDay === day;
          const dayProgress = getDayProgress(day);
          const allDayMealsCooked = dayProgress.total > 0 && dayProgress.cooked === dayProgress.total;
          
          return (
            <div key={day}>
              <div
                onClick={() => handleDayClick(day)}
                className={`flex items-center py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg cursor-pointer transition-colors ${expandedDay === day
                  ? 'bg-[#FF6B6B] text-white'
                  : 'text-[#2D3436] hover:bg-[#f8f9fa]'
                  }`}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                ) : (
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                )}
                <span className="text-xs sm:text-sm font-medium">{day}</span>
                {hasMeals && (
                  <div className="ml-auto flex items-center gap-2">
                    {dayProgress.total > 0 && (
                      <span className={`text-[9px] sm:text-xs ${expandedDay === day ? 'text-white/80' : 'text-gray-500'}`}>
                        {dayProgress.cooked}/{dayProgress.total}
                      </span>
                    )}
                    {allDayMealsCooked ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />
                      </div>
                    ) : (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                    )}
                  </div>
                )}
              </div>
              {/* Show meal preview when day is expanded and meals are available */}
              {isExpanded && mealPreview && (
                <div className="ml-4 sm:ml-6 mt-2 space-y-2 sm:space-y-3 text-xs">
                  {/* Breakfast */}
                  <div className={`p-1.5 sm:p-2 border rounded transition-all ${
                    isMealCooked(day, 'breakfast') 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full overflow-hidden flex-shrink-0">
                          {foodImages[mealPreview.breakfast.name] || mealPreview.breakfast.image ? (
                            <img
                              src={foodImages[mealPreview.breakfast.name] || mealPreview.breakfast.image}
                              alt={mealPreview.breakfast.name}
                              className="w-full h-full object-cover"
                              onLoad={() => fetchFoodImage(mealPreview.breakfast.name, mealPreview.breakfast.image)}
                            />
                          ) : (
                            <div className="w-full h-full bg-yellow-200 flex items-center justify-center text-[10px] sm:text-xs">
                              🥞
                            </div>
                          )}
                        </div>
                        <span className="text-[#1e293b] font-medium truncate text-[10px] sm:text-xs">{mealPreview.breakfast.name}</span>
                      </div>
                      <CookedButton day={day} mealType="breakfast" />
                    </div>
                    {mealPreview.breakfast.calories && (
                      <div className="flex items-center gap-1.5 sm:gap-3 text-[9px] sm:text-xs text-gray-600">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-500" />
                          <span>{mealPreview.breakfast.calories}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Drumstick className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500" />
                          <span>{mealPreview.breakfast.protein}g</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Wheat className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
                          <span>{mealPreview.breakfast.carbs}g</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Droplet className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500" />
                          <span>{mealPreview.breakfast.fat}g</span>
                        </div>
                      </div>
                    )}
                    {mealPreview.breakfast.benefit && (
                      <div className="text-[9px] sm:text-xs text-green-700 mt-0.5 sm:mt-1 italic line-clamp-2">
                        💡 {mealPreview.breakfast.benefit}
                      </div>
                    )}
                  </div>

                  {/* Lunch */}
                  <div className={`p-1.5 sm:p-2 border rounded transition-all ${
                    isMealCooked(day, 'lunch') 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-emerald-50 border-emerald-200'
                  }`}>
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <span className="text-[#FF6B6B] text-sm sm:text-base">🍽️</span>
                        <span className="text-[#1e293b] font-medium truncate text-[10px] sm:text-xs">{mealPreview.lunch.name}</span>
                      </div>
                      <CookedButton day={day} mealType="lunch" />
                    </div>
                    {mealPreview.lunch.calories && (
                      <div className="flex items-center gap-1.5 sm:gap-3 text-[9px] sm:text-xs text-gray-600">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-500" />
                          <span>{mealPreview.lunch.calories}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Drumstick className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500" />
                          <span>{mealPreview.lunch.protein}g</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Wheat className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
                          <span>{mealPreview.lunch.carbs}g</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Droplet className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500" />
                          <span>{mealPreview.lunch.fat}g</span>
                        </div>
                      </div>
                    )}
                    {mealPreview.lunch.benefit && (
                      <div className="text-[9px] sm:text-xs text-green-700 mt-0.5 sm:mt-1 italic line-clamp-2">
                        💡 {mealPreview.lunch.benefit}
                      </div>
                    )}
                  </div>

                  {/* Dinner */}
                  <div className={`p-1.5 sm:p-2 border rounded transition-all ${
                    isMealCooked(day, 'dinner') 
                      ? 'bg-green-50 border-green-300' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <span className="text-[#6366f1] text-sm sm:text-base">🍛</span>
                        <span className="text-[#1e293b] font-medium truncate text-[10px] sm:text-xs">{mealPreview.dinner.name}</span>
                      </div>
                      <CookedButton day={day} mealType="dinner" />
                    </div>
                    {mealPreview.dinner.calories && (
                      <div className="flex items-center gap-1.5 sm:gap-3 text-[9px] sm:text-xs text-gray-600">
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-500" />
                          <span>{mealPreview.dinner.calories}</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Drumstick className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500" />
                          <span>{mealPreview.dinner.protein}g</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Wheat className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
                          <span>{mealPreview.dinner.carbs}g</span>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                          <Droplet className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500" />
                          <span>{mealPreview.dinner.fat}g</span>
                        </div>
                      </div>
                    )}
                    {mealPreview.dinner.benefit && (
                      <div className="text-[9px] sm:text-xs text-green-700 mt-0.5 sm:mt-1 italic line-clamp-2">
                        💡 {mealPreview.dinner.benefit}
                      </div>
                    )}
                  </div>

                  {/* Snack */}
                  {mealPreview.snack && (
                    <div className={`p-1.5 sm:p-2 border rounded transition-all ${
                      isMealCooked(day, 'snack') 
                        ? 'bg-green-50 border-green-300' 
                        : 'bg-purple-50 border-purple-200'
                    }`}>
                      <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                          <span className="text-[#00b894] text-sm sm:text-base">🍪</span>
                          <span className="text-[#1e293b] font-medium truncate text-[10px] sm:text-xs">{mealPreview.snack.name}</span>
                        </div>
                        <CookedButton day={day} mealType="snack" />
                      </div>
                      {mealPreview.snack.calories && (
                        <div className="flex items-center gap-1.5 sm:gap-3 text-[9px] sm:text-xs text-gray-600">
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <Flame className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-orange-500" />
                            <span>{mealPreview.snack.calories}</span>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <Drumstick className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500" />
                            <span>{mealPreview.snack.protein}g</span>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <Wheat className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-500" />
                            <span>{mealPreview.snack.carbs}g</span>
                          </div>
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            <Droplet className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-yellow-500" />
                            <span>{mealPreview.snack.fat}g</span>
                          </div>
                        </div>
                      )}
                      {mealPreview.snack.benefit && (
                        <div className="text-[9px] sm:text-xs text-green-700 mt-0.5 sm:mt-1 italic line-clamp-2">
                          💡 {mealPreview.snack.benefit}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyPlanner;
