import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import EngagementBanners from '@/components/EngagementBanners';
import WeekCalendar from '@/components/WeekCalendar';
import { useAuth } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useSicknessSettings } from '@/hooks/useSicknessSettings';
import { useMealPlans, MealPlan } from '@/hooks/useMealPlans';
import { useTrial } from '@/hooks/useTrial';
import { APP_CONFIG } from '@/lib/config';
import { COUNTRIES, getCurrencyForCountry } from '@/lib/countryCurrency';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

const transformSickMealPlan = (mealPlan: any[]): MealPlan[] =>
  mealPlan.map((dayPlan: any) => ({
    day: dayPlan.day,
    breakfast: dayPlan.breakfast_name,
    lunch: dayPlan.lunch_name,
    dinner: dayPlan.dinner_name,
    snack: dayPlan.snack_name,
    breakfast_ingredients: dayPlan.breakfast_ingredients,
    lunch_ingredients: dayPlan.lunch_ingredients,
    dinner_ingredients: dayPlan.dinner_ingredients,
    snack_ingredients: dayPlan.snack_ingredients,
    breakfast_name: dayPlan.breakfast_name,
    breakfast_calories: dayPlan.breakfast_calories,
    breakfast_protein: dayPlan.breakfast_protein,
    breakfast_carbs: dayPlan.breakfast_carbs,
    breakfast_fat: dayPlan.breakfast_fat,
    breakfast_benefit: dayPlan.breakfast_benefit,
    lunch_name: dayPlan.lunch_name,
    lunch_calories: dayPlan.lunch_calories,
    lunch_protein: dayPlan.lunch_protein,
    lunch_carbs: dayPlan.lunch_carbs,
    lunch_fat: dayPlan.lunch_fat,
    lunch_benefit: dayPlan.lunch_benefit,
    dinner_name: dayPlan.dinner_name,
    dinner_calories: dayPlan.dinner_calories,
    dinner_protein: dayPlan.dinner_protein,
    dinner_carbs: dayPlan.dinner_carbs,
    dinner_fat: dayPlan.dinner_fat,
    dinner_benefit: dayPlan.dinner_benefit,
    snack_name: dayPlan.snack_name,
    snack_calories: dayPlan.snack_calories,
    snack_protein: dayPlan.snack_protein,
    snack_carbs: dayPlan.snack_carbs,
    snack_fat: dayPlan.snack_fat,
    snack_benefit: dayPlan.snack_benefit,
  }));

const LocationBudgetPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    getSicknessInfo,
    getHealthProfilePayload,
    isHealthProfileComplete,
    settings: sicknessSettings,
  } = useSicknessSettings();

  const { saveMealPlan, generateWeekDates } = useMealPlans(sicknessSettings.hasSickness);
  const {
    canGenerateMealPlan,
    hasActiveSubscription,
    freeMealPlanUsed,
    refreshStatus: refreshTrialStatus,
  } = useTrial();

  // Prefill location from health settings when available (same source as before)
  React.useEffect(() => {
    if (sicknessSettings.location && !location) {
      setLocation(sicknessSettings.location);
    }
  }, [sicknessSettings.location, location]);

  const currency = getCurrencyForCountry(location);
  const weekDates = generateWeekDates(selectedDate);

  const promptForSubscription = async () => {
    const result = await Swal.fire({
      icon: 'info',
      title: 'Subscribe to generate more meal plans',
      text: "You've already used your free 7-day meal plan. Subscribe to generate unlimited new meal plans.",
      showCancelButton: true,
      confirmButtonText: 'Subscribe',
      cancelButtonText: 'Maybe later',
      confirmButtonColor: '#0E3E77',
    });
    if (result.isConfirmed) {
      navigate('/payment');
    }
  };

  const handleGenerate = async () => {
    if (!location.trim()) {
      toast({
        title: 'Location needed',
        description: 'Please select your country.',
        variant: 'destructive',
      });
      return;
    }
    if (!budget.trim() || Number(budget) <= 0) {
      toast({
        title: 'Budget needed',
        description: 'Please enter a weekly budget greater than zero.',
        variant: 'destructive',
      });
      return;
    }

    if (!hasActiveSubscription && (freeMealPlanUsed || !canGenerateMealPlan)) {
      await promptForSubscription();
      return;
    }

    setIsGenerating(true);

    try {
      const formData = new FormData();
      const sicknessInfo = getSicknessInfo();
      const healthProfilePayload = getHealthProfilePayload();

      if (sicknessInfo) {
        if (!isHealthProfileComplete()) {
          toast({
            title: 'Complete Health Profile Required',
            description:
              'Please complete your health profile in Health info to auto-generate health-aware meal plans',
            variant: 'destructive',
          });
          setIsGenerating(false);
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
        if (data.success && data.meal_plan) {
          const savedPlan = await saveMealPlan(
            transformSickMealPlan(data.meal_plan),
            selectedDate,
            data.health_assessment,
            data.user_info,
            {
              hasSickness: sicknessSettings.hasSickness,
              sicknessType: sicknessSettings.sicknessType,
            }
          );

          toast({
            title: 'Meal plan created',
            description: `Your plan for ${savedPlan?.name || weekDates.name} is ready.`,
          });
          navigate('/planner');
          return;
        }
        throw new Error('Failed to generate meal plan');
      }

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
      const savedPlan = await saveMealPlan(
        data.meal_plan,
        selectedDate,
        undefined,
        undefined,
        {
          hasSickness: sicknessSettings.hasSickness,
          sicknessType: sicknessSettings.sicknessType,
        }
      );

      toast({
        title: 'Meal plan created',
        description: `Your plan for ${savedPlan?.name || weekDates.name} is ready.`,
      });
      navigate('/planner');
    } catch (error: any) {
      console.error('Error generating meal plan:', error);

      if (error?.code === 'PAYMENT_REQUIRED' || error?.status === 402) {
        try {
          await refreshTrialStatus();
        } catch {
          /* noop */
        }
        await promptForSubscription();
        return;
      }

      const errorMessage = error?.message || '';
      if (
        errorMessage.includes('duplicate key value') &&
        errorMessage.includes('unique_user_week')
      ) {
        Swal.fire({
          icon: 'warning',
          title: 'Duplicate Plan',
          text: 'A meal plan for this week already exists. Please choose a different week or edit the existing plan.',
          confirmButtonColor: '#0E3E77',
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Generation Failed',
          text: 'Failed to generate meal plan. Please try again.',
          confirmButtonColor: '#0E3E77',
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="px-4 sm:px-6 md:px-8 h-[70px] sm:h-[80px] md:h-[88px] flex items-center border-b border-border bg-card">
        <div className="flex items-center justify-between w-full gap-2 sm:gap-4 max-w-3xl mx-auto">
          <h1 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight truncate pl-12 md:pl-0">
            Meals with location and budget
          </h1>

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
      </header>

      <div className="max-w-3xl mx-auto w-full">
        <EngagementBanners />
      </div>

      <div className="px-4 sm:px-6 md:px-8 py-6 sm:py-8 max-w-3xl mx-auto w-full">
        <p className="text-muted-foreground leading-relaxed mb-6 text-center sm:text-left">
          Pick a week, set your location and budget, then generate a meal plan.
        </p>

        <div className="mb-8 rounded-2xl border border-border bg-secondary/60 px-5 py-4 text-center sm:text-left">
          <p className="text-sm text-foreground">
            View your previous meals in{' '}
            <button
              type="button"
              onClick={() => navigate('/planner?saved=1')}
              className="text-primary font-semibold hover:underline"
            >
              Saved Plans
            </button>
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-soft">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Select week
            </label>
            <WeekCalendar
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Creating plan for: {weekDates.name}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Your location
            </label>
            <Select
              value={location || undefined}
              onValueChange={setLocation}
              disabled={isGenerating}
            >
              <SelectTrigger className="w-full h-11 rounded-xl border-border bg-background">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Helps us suggest ingredients that are available near you.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Weekly budget
            </label>
            <div className="flex items-stretch rounded-xl border border-border focus-within:border-primary overflow-hidden">
              <span className="flex items-center px-3 bg-secondary text-sm font-semibold text-foreground border-r border-border whitespace-nowrap">
                {currency.symbol}
              </span>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g., 150"
                min="0"
                step="any"
                disabled={isGenerating}
                className="w-full p-3 focus:outline-none bg-background"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {location
                ? `Weekly budget in ${currency.name} (${currency.code})`
                : 'Select a location to set your local currency'}
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full rounded-full bg-primary hover:bg-blue-deep text-white px-6 py-3.5 font-semibold disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating plan…
              </>
            ) : (
              'Generate meal plan'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationBudgetPage;
