import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChefHat, LayoutGrid, List, RefreshCw } from 'lucide-react';
import Swal from 'sweetalert2';
import CookingTutorialModal from '@/components/CookingTutorialModal';
import { useAuth, safeGetItem, safeSetItem, safeRemoveItem } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';
import { useTrial } from '@/hooks/useTrial';
import { LifecycleService } from '@/lib/lifecycleService';
import { markLocalFreeGenerationUsed } from '@/lib/trialService';
import { APP_CONFIG } from '@/lib/config';
import { imageCache } from '@/lib/imageCache';

const FOOD_FOR_YOU_CACHE_KEY = 'meallensai_food_for_you_v1';
const FOOD_FOR_YOU_VIEW_KEY = 'meallensai_food_for_you_view_v1';

type FoodCachePayload = {
  userId?: string;
  foods: FoodItem[];
  savedAt: number;
};

const readViewMode = (): 'box' | 'list' => {
  try {
    const stored = safeGetItem(FOOD_FOR_YOU_VIEW_KEY);
    return stored === 'list' ? 'list' : 'box';
  } catch {
    return 'box';
  }
};

const writeViewMode = (mode: 'box' | 'list') => {
  try {
    safeSetItem(FOOD_FOR_YOU_VIEW_KEY, mode);
  } catch {
    /* ignore */
  }
};

const readFoodCache = (userId?: string): FoodItem[] | null => {
  try {
    const raw = safeGetItem(FOOD_FOR_YOU_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FoodCachePayload;
    if (!parsed || !Array.isArray(parsed.foods) || parsed.foods.length === 0) {
      return null;
    }
    // If we know the user, only reuse their cache
    if (userId && parsed.userId && parsed.userId !== userId) {
      return null;
    }
    return parsed.foods;
  } catch {
    return null;
  }
};

const writeFoodCache = (foods: FoodItem[], userId?: string) => {
  try {
    const payload: FoodCachePayload = {
      userId,
      foods,
      savedAt: Date.now(),
    };
    safeSetItem(FOOD_FOR_YOU_CACHE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota errors */
  }
};

export const clearFoodForYouCache = () => {
  safeRemoveItem(FOOD_FOR_YOU_CACHE_KEY);
};

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

interface FoodItem {
  id: string;
  name: string;
  mealType: MealType;
  day: string;
  ingredients: string[];
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  benefit?: string;
}

const mapGoalToBackendFormat = (goal: string | undefined): string => {
  if (!goal) return 'heal';
  const normalizedGoal = goal.trim();
  const goalMap: Record<string, string> = {
    Heal: 'heal',
    Improve: 'heal',
    Manage: 'heal',
    Restore: 'heal',
    Maintain: 'maintain',
    heal: 'heal',
    improve: 'heal',
    manage: 'heal',
    restore: 'heal',
    maintain: 'maintain',
    'Heal Health Condition': 'heal',
    'Improve Health Condition': 'heal',
    'Manage Health Condition': 'heal',
    'Restore Health Condition': 'heal',
    'Maintain Health Condition': 'maintain',
    'Heal & Manage Condition': 'heal',
    'Maintain Health': 'maintain',
    lose_weight: 'lose_weight',
    gain_weight: 'gain_weight',
    improve_fitness: 'improve_fitness',
  };
  if (goalMap[normalizedGoal]) return goalMap[normalizedGoal];
  const lowerGoal = normalizedGoal.toLowerCase();
  for (const [key, value] of Object.entries(goalMap)) {
    if (key.toLowerCase() === lowerGoal) return value;
  }
  return lowerGoal.includes('maintain') ? 'maintain' : 'heal';
};

const stripEmoji = (value: string) =>
  value
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

const extractFoodName = (value?: string) => {
  if (!value) return '';
  return value.replace(/\s*\(buy:[^)]*\)/, '').trim();
};

/** Flatten a 7-day meal plan into individual food cards for display. */
const flattenMealPlanToFoods = (mealPlan: any[]): FoodItem[] => {
  const foods: FoodItem[] = [];

  mealPlan.forEach((dayPlan, dayIndex) => {
    const day = dayPlan.day || `Day ${dayIndex + 1}`;
    const meals: Array<{
      type: MealType;
      name?: string;
      ingredients?: string[];
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      benefit?: string;
    }> = [
      {
        type: 'breakfast',
        name: dayPlan.breakfast_name || dayPlan.breakfast,
        ingredients: dayPlan.breakfast_ingredients,
        calories: dayPlan.breakfast_calories,
        protein: dayPlan.breakfast_protein,
        carbs: dayPlan.breakfast_carbs,
        fat: dayPlan.breakfast_fat,
        benefit: dayPlan.breakfast_benefit,
      },
      {
        type: 'lunch',
        name: dayPlan.lunch_name || dayPlan.lunch,
        ingredients: dayPlan.lunch_ingredients,
        calories: dayPlan.lunch_calories,
        protein: dayPlan.lunch_protein,
        carbs: dayPlan.lunch_carbs,
        fat: dayPlan.lunch_fat,
        benefit: dayPlan.lunch_benefit,
      },
      {
        type: 'dinner',
        name: dayPlan.dinner_name || dayPlan.dinner,
        ingredients: dayPlan.dinner_ingredients,
        calories: dayPlan.dinner_calories,
        protein: dayPlan.dinner_protein,
        carbs: dayPlan.dinner_carbs,
        fat: dayPlan.dinner_fat,
        benefit: dayPlan.dinner_benefit,
      },
      {
        type: 'snack',
        name: dayPlan.snack_name || dayPlan.snack,
        ingredients: dayPlan.snack_ingredients,
        calories: dayPlan.snack_calories,
        protein: dayPlan.snack_protein,
        carbs: dayPlan.snack_carbs,
        fat: dayPlan.snack_fat,
        benefit: dayPlan.snack_benefit,
      },
    ];

    meals.forEach((meal) => {
      const name = extractFoodName(meal.name);
      if (!name) return;
      foods.push({
        id: `${day}-${meal.type}-${name}`.toLowerCase().replace(/\s+/g, '-'),
        name,
        mealType: meal.type,
        day,
        ingredients: Array.isArray(meal.ingredients)
          ? meal.ingredients.filter(Boolean)
          : [],
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        benefit: meal.benefit ? stripEmoji(meal.benefit) : undefined,
      });
    });
  });

  return foods;
};

const mealTypeLabel: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const FoodImage: React.FC<{ name: string; className?: string }> = ({
  name,
  className = '',
}) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    imageCache
      .getImage(name)
      .then((src) => {
        if (!cancelled) setUrl(src);
      })
      .catch(() => {
        if (!cancelled) setUrl(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  if (loading) {
    return (
      <div
        className={`bg-gradient-to-br from-muted via-secondary to-muted animate-pulse ${className}`}
      />
    );
  }

  if (url) {
    return (
      <img src={url} alt={name} className={`object-cover ${className}`} />
    );
  }

  return (
    <div
      className={`bg-leaf-soft flex items-center justify-center text-leaf text-sm font-semibold px-3 text-center ${className}`}
    >
      {name}
    </div>
  );
};

const FoodForYouPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'box' | 'list'>(() => readViewMode());
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const autoStarted = useRef(false);
  const trialPrompted = useRef(false);

  const {
    getSicknessInfo,
    getHealthProfilePayload,
    isHealthProfileComplete,
    settings: sicknessSettings,
    loading: settingsLoading,
  } = useSicknessSettings();

  const {
    canGenerateMealPlan,
    hasActiveSubscription,
    freeMealPlanUsed,
    isLoading: trialLoading,
    refreshStatus: refreshTrialStatus,
  } = useTrial();

  const location = sicknessSettings.location || '';
  const blocked = !hasActiveSubscription && (freeMealPlanUsed || !canGenerateMealPlan);

  const selectViewMode = (mode: 'box' | 'list') => {
    setViewMode(mode);
    writeViewMode(mode);
  };

  // Same SweetAlert copy as meal-plan create flow
  const promptForSubscription = async (
    title: string = 'Subscribe to generate more meal plans',
    description: string = "You've already used your free 7-day meal plan. Subscribe to generate unlimited new meal plans.",
  ) => {
    const result = await Swal.fire({
      icon: 'info',
      title,
      text: description,
      showCancelButton: true,
      confirmButtonText: 'Subscribe',
      cancelButtonText: 'Maybe later',
      confirmButtonColor: '#0E3E77',
    });
    if (result.isConfirmed) {
      navigate('/payment');
    }
  };

  /**
   * Same AI generate flow as location-budget, but does NOT save a meal plan.
   * After the first successful generate, marks the free trial used via the
   * existing /api/lifecycle/mark-trial-used endpoint (+ local flag for UI gate).
   */
  const fetchFoods = async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = readFoodCache(user?.id);
      if (cached && cached.length > 0) {
        setFoods(cached);
        return;
      }
    }

    // Same gate as meal plans / scan ingredients
    if (!hasActiveSubscription && (freeMealPlanUsed || !canGenerateMealPlan)) {
      await promptForSubscription();
      return;
    }

    if (!location.trim()) {
      toast({
        title: 'Location needed',
        description: 'Set your location in Health info or Meals with location and budget first.',
        variant: 'destructive',
      });
      return;
    }

    const sicknessInfo = getSicknessInfo();
    const healthProfilePayload = getHealthProfilePayload();
    const budget = safeGetItem('meallensai_weekly_budget_v1') || '150';

    setLoading(true);
    try {
      const formData = new FormData();
      let rawPlan: any[] = [];

      if (sicknessInfo) {
        if (!isHealthProfileComplete()) {
          toast({
            title: 'Complete Health Profile Required',
            description:
              'Please complete your health profile in Health info to get personalized food.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        formData.append('image_or_ingredient_list', 'ingredient_list');
        formData.append('ingredient_list', '');
        formData.append('age', healthProfilePayload!.age.toString());
        formData.append('weight', healthProfilePayload!.weight.toString());
        formData.append('height', healthProfilePayload!.height.toString());
        formData.append('waist', healthProfilePayload!.waist.toString());
        formData.append('gender', healthProfilePayload!.gender);
        formData.append('activity_level', healthProfilePayload!.activity_level);
        formData.append('condition', healthProfilePayload!.condition);
        formData.append('goal', mapGoalToBackendFormat(healthProfilePayload!.goal));
        formData.append('location', location);
        formData.append('budget_state', 'true');
        formData.append('budget', budget);

        const response = await fetch(`${APP_CONFIG.api.ai_api_url}/sick_smart_plan`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to auto-generate therapeutic meal plan');
        }

        const data = await response.json();
        if (!(data.success && data.meal_plan)) {
          throw new Error('Failed to generate food recommendations');
        }
        rawPlan = data.meal_plan;
      } else {
        formData.append('location', location);
        formData.append('budget', budget);

        const response = await fetch(`${APP_CONFIG.api.ai_api_url}/auto_generate_plan`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to generate meal plan');
        }

        const data = await response.json();
        const plan = data.meal_plan || data;
        rawPlan = Array.isArray(plan) ? plan : [];
        if (rawPlan.length === 0) {
          throw new Error('Failed to generate food recommendations');
        }
      }

      const nextFoods = flattenMealPlanToFoods(rawPlan);
      setFoods(nextFoods);
      writeFoodCache(nextFoods, user?.id);

      // Mark free plan used without saving to Saved meal plans
      // (existing lifecycle endpoint sets user_trials.is_used = true)
      try {
        await LifecycleService.markTrialUsed();
      } catch {
        /* still set local gate below */
      }
      markLocalFreeGenerationUsed();
      try {
        await refreshTrialStatus();
      } catch {
        /* non-fatal */
      }
    } catch (error: any) {
      console.error('[FoodForYou] Error:', error);

      if (error?.code === 'PAYMENT_REQUIRED' || error?.status === 402) {
        try {
          await refreshTrialStatus();
        } catch {
          /* noop */
        }
        await promptForSubscription();
        return;
      }

      Swal.fire({
        icon: 'error',
        title: 'Could not load food',
        text: 'Failed to get personalized food. Please try again.',
        confirmButtonColor: '#0E3E77',
      });
    } finally {
      setLoading(false);
    }
  };

  // Restore from cache first; only auto-generate once if free plan still available
  useEffect(() => {
    if (autoStarted.current) return;

    const cached = readFoodCache(user?.id);
    if (cached && cached.length > 0) {
      setFoods(cached);
      autoStarted.current = true;
      return;
    }

    if (settingsLoading || trialLoading) return;

    // Free plan already used — same as meal plans: no auto-generate; prompt once
    if (blocked) {
      autoStarted.current = true;
      if (!trialPrompted.current) {
        trialPrompted.current = true;
        void promptForSubscription();
      }
      return;
    }

    if (!location.trim()) return;
    if (sicknessSettings.hasSickness && !isHealthProfileComplete()) return;

    autoStarted.current = true;
    fetchFoods(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settingsLoading,
    trialLoading,
    blocked,
    location,
    sicknessSettings.hasSickness,
    user?.id,
  ]);

  const featured = useMemo(() => {
    if (foods.length === 0) return [];
    const shuffled = [...foods].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [foods]);

  const openFood = (food: FoodItem) => {
    setSelectedFood(food);
    setShowTutorial(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 sm:px-6 md:px-8 h-[70px] sm:h-[80px] md:h-[88px] flex items-center border-b border-border bg-card">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4">
          <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight truncate pl-12 md:pl-0">
            Food for you
          </h1>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Box / List view toggle */}
            <div className="inline-flex items-center rounded-full border border-border bg-secondary p-1">
              <button
                type="button"
                onClick={() => selectViewMode('box')}
                aria-label="Box view"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                  viewMode === 'box'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Box</span>
              </button>
              <button
                type="button"
                onClick={() => selectViewMode('list')}
                aria-label="List view"
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchFoods(true)}
              disabled={loading}
              className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center h-[36px] sm:h-[40px] md:h-[48px] gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-3 md:px-4 rounded-full border border-border bg-card hover:bg-secondary transition-colors"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 bg-leaf-soft rounded-full flex items-center justify-center text-primary font-semibold text-[10px] sm:text-xs md:text-sm border border-border">
                  {(user?.displayName || user?.email?.split('@')[0] || 'U')
                    .substring(0, 2)
                    .toUpperCase()}
                </div>
                <span className="text-xs sm:text-sm md:text-[15px] font-medium text-muted-foreground hidden lg:block">
                  {user?.displayName || user?.email?.split('@')[0] || 'User'}
                </span>
                <ChevronDown
                  className={`h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground transition-transform ${
                    showProfileDropdown ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showProfileDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfileDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-card rounded-2xl shadow-elevated border border-border py-2 z-50">
                    <a
                      href="/profile"
                      className="block px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-[15px] text-foreground hover:bg-secondary"
                    >
                      Profile
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8">
        {(loading || settingsLoading || trialLoading) && foods.length === 0 && !blocked && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8">
            <div
              className={
                viewMode === 'box'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5'
                  : 'space-y-3'
              }
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`rounded-2xl border border-border bg-card overflow-hidden shadow-soft ${
                    viewMode === 'list' ? 'flex gap-4 p-3' : ''
                  }`}
                >
                  <div
                    className={`bg-muted animate-pulse ${
                      viewMode === 'list' ? 'w-24 h-24 rounded-xl flex-shrink-0' : 'h-40'
                    }`}
                  />
                  <div className={`${viewMode === 'list' ? 'flex-1 py-2' : 'p-4'} space-y-3`}>
                    <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block rounded-2xl border border-border bg-leaf-soft/60 h-[420px] animate-pulse" />
          </div>
        )}

        {!blocked && !location.trim() && !settingsLoading && !trialLoading && foods.length === 0 && !loading && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft max-w-lg mx-auto">
            <p className="text-muted-foreground mb-4">
              Set your location in Health info to load food for you.
            </p>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="rounded-full bg-primary text-white px-6 py-3 font-semibold"
            >
              Open Health info
            </button>
          </div>
        )}

        {foods.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-8 items-start">
            <div>
              <p className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <ChefHat className="w-4 h-4 text-primary flex-shrink-0" />
                Tap any meal to open cooking instructions
              </p>

              {viewMode === 'box' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                  {foods.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => openFood(food)}
                      aria-label={`Open cooking instructions for ${food.name}`}
                      className="text-left group rounded-2xl border border-border bg-card overflow-hidden shadow-soft hover:shadow-card hover:border-primary/25 transition-all"
                    >
                      <div className="relative h-40 overflow-hidden">
                        <FoodImage
                          name={food.name}
                          className="w-full h-full group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <span className="absolute top-3 left-3 rounded-full bg-card/95 border border-border px-2.5 py-1 text-[11px] font-semibold text-foreground">
                          {mealTypeLabel[food.mealType]}
                        </span>
                        {food.calories !== undefined && (
                          <span className="absolute bottom-3 right-3 rounded-full bg-foreground/80 text-white px-2.5 py-1 text-[11px] font-semibold">
                            {food.calories} kcal
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-foreground text-[15px] leading-snug line-clamp-2 mb-3">
                          {food.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {food.protein !== undefined && (
                            <span className="rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground">
                              <span className="text-muted-foreground">Protein </span>
                              {food.protein}g
                            </span>
                          )}
                          {food.carbs !== undefined && (
                            <span className="rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground">
                              <span className="text-muted-foreground">Carbs </span>
                              {food.carbs}g
                            </span>
                          )}
                          {food.fat !== undefined && (
                            <span className="rounded-lg bg-secondary px-2.5 py-1.5 text-[11px] font-medium text-foreground">
                              <span className="text-muted-foreground">Fat </span>
                              {food.fat}g
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:underline">
                          <ChefHat className="w-3.5 h-3.5" />
                          Cooking instructions
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {foods.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => openFood(food)}
                      aria-label={`Open cooking instructions for ${food.name}`}
                      className="w-full flex gap-4 text-left rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-soft hover:shadow-card hover:border-primary/25 transition-all group"
                    >
                      <FoodImage
                        name={food.name}
                        className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1 py-0.5 flex flex-col">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <h3 className="font-semibold text-foreground text-[15px] sm:text-base leading-snug line-clamp-2">
                            {food.name}
                          </h3>
                          {food.calories !== undefined && (
                            <span className="flex-shrink-0 text-xs font-semibold text-muted-foreground">
                              {food.calories} kcal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {mealTypeLabel[food.mealType]}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-auto">
                          {food.protein !== undefined && (
                            <span className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                              Protein {food.protein}g
                            </span>
                          )}
                          {food.carbs !== undefined && (
                            <span className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                              Carbs {food.carbs}g
                            </span>
                          )}
                          {food.fat !== undefined && (
                            <span className="rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground">
                              Fat {food.fat}g
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-primary group-hover:underline">
                          <ChefHat className="w-3.5 h-3.5" />
                          Cooking instructions
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <aside className="lg:sticky lg:top-6 space-y-4">
              <div className="rounded-2xl border border-leaf/20 bg-leaf-soft p-5 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-leaf mb-2">
                  Wonderful picks
                </p>
                <h3 className="font-display text-xl font-bold text-foreground tracking-tight mb-2">
                  Fresh food made for you
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  Tap a pick to get cooking instructions for that meal.
                </p>

                <div className="space-y-3">
                  {featured.map((food) => (
                    <button
                      key={`feat-${food.id}`}
                      type="button"
                      onClick={() => openFood(food)}
                      aria-label={`Open cooking instructions for ${food.name}`}
                      className="w-full flex gap-3 rounded-xl bg-card border border-border p-2.5 text-left hover:border-primary/30 transition-colors group"
                    >
                      <FoodImage
                        name={food.name}
                        className="w-16 h-16 rounded-lg flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1 py-0.5">
                        <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                          {food.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {mealTypeLabel[food.mealType]}
                          {food.protein !== undefined
                            ? ` · ${food.protein}g protein`
                            : ''}
                        </p>
                        <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-primary group-hover:underline">
                          <ChefHat className="w-3 h-3" />
                          Cooking instructions
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm font-semibold text-foreground mb-1">
                  Want a full week plan?
                </p>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Turn these picks into a structured week in Meals with location
                  and budget.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/location-budget')}
                  className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  Build a week plan
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>

      <CookingTutorialModal
        isOpen={showTutorial}
        onClose={() => {
          setShowTutorial(false);
          setSelectedFood(null);
        }}
        recipeName={selectedFood?.name || ''}
        ingredients={selectedFood?.ingredients || []}
      />
    </div>
  );
};

export default FoodForYouPage;
