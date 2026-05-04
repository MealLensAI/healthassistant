import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export interface MealPlan {
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

export interface HealthAssessment {
  whtr?: number;
  whtr_category?: string;
  bmr?: number;
  daily_calories?: number;
}

export interface SavedMealPlan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  mealPlan: MealPlan[];
  createdAt: string;
  updatedAt: string;
  healthAssessment?: HealthAssessment;
  userInfo?: any;
  hasSickness?: boolean;
  sicknessType?: string;
}

const normalizeMealPlanArray = (raw: any): MealPlan[] => {
  if (Array.isArray(raw)) return raw as MealPlan[];
  if (raw && typeof raw === 'object') {
    if (Array.isArray(raw.mealPlan)) return raw.mealPlan as MealPlan[];
    if (Array.isArray(raw.plan_data?.mealPlan)) return raw.plan_data.mealPlan as MealPlan[];
    if (typeof raw.day === 'string') return [raw as MealPlan];
  }
  return [];
};

const parsePlan = (raw: any): SavedMealPlan | null => {
  if (!raw) return null;
  const data = raw.plan_data || raw;
  const mealPlan = normalizeMealPlanArray(data.mealPlan || data);
  const id = raw.id || data.id || Math.random().toString(36).slice(2);
  const name = data.name || raw.name || 'Meal Plan';
  const startDate = data.startDate || raw.start_date || new Date().toISOString();
  const endDate =
    data.endDate ||
    raw.end_date ||
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  return {
    id,
    name,
    startDate,
    endDate,
    mealPlan,
    createdAt: raw.created_at || data.createdAt || new Date().toISOString(),
    updatedAt: raw.updated_at || data.updatedAt || new Date().toISOString(),
    healthAssessment: data.healthAssessment,
    userInfo: data.userInfo,
    hasSickness: data.hasSickness,
    sicknessType: data.sicknessType,
  };
};

export function generateWeekDates(startDate: Date = new Date()): string[] {
  const result: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

export const useMealPlans = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [plans, setPlans] = useState<SavedMealPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<SavedMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchPlans = useCallback(async () => {
    if (authLoading || !isAuthenticated) {
      if (mounted.current) {
        setInitialized(true);
        setLoading(false);
      }
      return;
    }
    if (mounted.current) setLoading(true);
    try {
      const result: any = await api.getMealPlans();
      const raw = result?.meal_plans || result?.data?.meal_plans || result?.plans || [];
      const parsed: SavedMealPlan[] = (raw || [])
        .map(parsePlan)
        .filter(Boolean) as SavedMealPlan[];
      if (mounted.current) {
        setPlans(parsed);
        setCurrentPlan((prev) => {
          if (prev) {
            const match = parsed.find((p) => p.id === prev.id);
            return match || parsed[0] || null;
          }
          return parsed[0] || null;
        });
        setError(null);
      }
    } catch (err: any) {
      if (mounted.current) setError(err?.message || 'Unable to load meal plans.');
    } finally {
      if (mounted.current) {
        setLoading(false);
        setInitialized(true);
      }
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (!authLoading) fetchPlans();
  }, [authLoading, isAuthenticated, fetchPlans]);

  const saveMealPlan = async (planData: any): Promise<SavedMealPlan | null> => {
    try {
      const result: any = await api.saveMealPlan(planData);
      if (result?.status === 'success') {
        await fetchPlans();
        return parsePlan(result.plan || result.data?.plan || planData);
      }
      setError(result?.message || 'Failed to save plan.');
      return null;
    } catch (err: any) {
      setError(err?.message || 'Failed to save plan.');
      return null;
    }
  };

  const deleteMealPlan = async (id: string) => {
    try {
      await api.deleteMealPlan(id);
      await fetchPlans();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete plan.');
    }
  };

  const selectMealPlan = (id: string) => {
    const match = plans.find((p) => p.id === id);
    if (match) setCurrentPlan(match);
  };

  return {
    plans,
    currentPlan,
    loading,
    initialized,
    error,
    saveMealPlan,
    deleteMealPlan,
    selectMealPlan,
    refreshMealPlans: fetchPlans,
    generateWeekDates,
  };
};
