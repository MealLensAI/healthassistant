/**
 * Enterprise Meal Plans Hook
 * Optimized hook for managing meal plans in enterprise/organization context
 * with proper image caching and performance optimizations.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { imageCache } from '@/lib/imageCache';

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

export interface SavedMealPlan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  meal_plan: MealPlan[];
  created_at: string;
  updated_at: string;
  has_sickness?: boolean;
  sickness_type?: string;
  health_assessment?: any;
  user_info?: any;
  is_approved?: boolean;
  creator_email?: string;
  is_created_by_user?: boolean;
}

export interface UserInfo {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

// Cache for enterprise meal plans
const enterpriseMealPlanCache = new Map<string, {
  plans: SavedMealPlan[];
  timestamp: number;
}>();

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Fallback images for different meal types
const FALLBACK_IMAGES = {
  breakfast: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
  lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  dinner: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
  snack: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
};

/**
 * Pre-fetch images for a meal plan to ensure fast loading
 */
async function prefetchMealPlanImages(mealPlan: MealPlan[]): Promise<MealPlan[]> {
  const updatedPlans = await Promise.all(
    mealPlan.map(async (dayPlan) => {
      const updatedDay = { ...dayPlan };

      // Fetch images in parallel for all meals
      const imagePromises: Promise<void>[] = [];

      if (dayPlan.breakfast_name && !dayPlan.breakfast_image) {
        imagePromises.push(
          imageCache.getImage(dayPlan.breakfast_name, FALLBACK_IMAGES.breakfast)
            .then(url => { updatedDay.breakfast_image = url; })
        );
      }

      if (dayPlan.lunch_name && !dayPlan.lunch_image) {
        imagePromises.push(
          imageCache.getImage(dayPlan.lunch_name, FALLBACK_IMAGES.lunch)
            .then(url => { updatedDay.lunch_image = url; })
        );
      }

      if (dayPlan.dinner_name && !dayPlan.dinner_image) {
        imagePromises.push(
          imageCache.getImage(dayPlan.dinner_name, FALLBACK_IMAGES.dinner)
            .then(url => { updatedDay.dinner_image = url; })
        );
      }

      if (dayPlan.snack_name && !dayPlan.snack_image) {
        imagePromises.push(
          imageCache.getImage(dayPlan.snack_name, FALLBACK_IMAGES.snack)
            .then(url => { updatedDay.snack_image = url; })
        );
      }

      await Promise.all(imagePromises);
      return updatedDay;
    })
  );

  return updatedPlans;
}

export function useEnterpriseMealPlans(enterpriseId: string, userId?: string) {
  const [mealPlans, setMealPlans] = useState<SavedMealPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<SavedMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track if we're currently fetching to prevent duplicate requests
  const fetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load meal plans for a user with caching and image prefetching
   */
  const loadMealPlans = useCallback(async (targetUserId: string, forceRefresh = false) => {
    if (!enterpriseId || !targetUserId) return;
    
    // Prevent duplicate fetches
    if (fetchingRef.current) return;
    
    const cacheKey = `${enterpriseId}_${targetUserId}`;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = enterpriseMealPlanCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setMealPlans(cached.plans);
        if (cached.plans.length > 0 && !currentPlan) {
          setCurrentPlan(cached.plans[0]);
        }
        return;
      }
    }
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    try {
      const result: any = await api.getUserMealPlans(enterpriseId, targetUserId);
      
      if (result.success) {
        let plans = result.meal_plans || [];
        
        // Pre-fetch images for all plans in parallel (background)
        const plansWithImages = await Promise.all(
          plans.map(async (plan: SavedMealPlan) => {
            if (plan.meal_plan && Array.isArray(plan.meal_plan)) {
              const updatedMealPlan = await prefetchMealPlanImages(plan.meal_plan);
              return { ...plan, meal_plan: updatedMealPlan };
            }
            return plan;
          })
        );
        
        // Update cache
        enterpriseMealPlanCache.set(cacheKey, {
          plans: plansWithImages,
          timestamp: Date.now()
        });
        
        setMealPlans(plansWithImages);
        if (plansWithImages.length > 0) {
          setCurrentPlan(plansWithImages[0]);
        } else {
          setCurrentPlan(null);
        }
      } else {
        setError(result.error || 'Failed to load meal plans');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err?.message || 'Failed to load meal plans');
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [enterpriseId, currentPlan]);

  /**
   * Create a new meal plan with image prefetching
   */
  const createMealPlan = useCallback(async (
    targetUserId: string,
    planData: {
      name: string;
      start_date: string;
      end_date: string;
      meal_plan: MealPlan[];
      has_sickness?: boolean;
      sickness_type?: string;
      health_assessment?: any;
      user_info?: any;
    }
  ) => {
    if (!enterpriseId || !targetUserId) {
      throw new Error('Enterprise ID and User ID are required');
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Pre-fetch images before saving
      const mealPlanWithImages = await prefetchMealPlanImages(planData.meal_plan);
      
      const result: any = await api.createUserMealPlan(enterpriseId, targetUserId, {
        ...planData,
        meal_plan: mealPlanWithImages
      });
      
      if (result.success) {
        // Invalidate cache
        const cacheKey = `${enterpriseId}_${targetUserId}`;
        enterpriseMealPlanCache.delete(cacheKey);
        
        // Refresh the list
        await loadMealPlans(targetUserId, true);
        
        return result.meal_plan;
      } else {
        throw new Error(result.error || 'Failed to create meal plan');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create meal plan');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [enterpriseId, loadMealPlans]);

  /**
   * Approve a meal plan
   */
  const approveMealPlan = useCallback(async (planId: string, targetUserId: string) => {
    if (!enterpriseId) return;
    
    try {
      const result: any = await api.approveMealPlan(enterpriseId, planId);
      
      if (result.success) {
        // Update local state
        setMealPlans(prev => prev.map(plan => 
          plan.id === planId ? { ...plan, is_approved: true } : plan
        ));
        
        if (currentPlan?.id === planId) {
          setCurrentPlan(prev => prev ? { ...prev, is_approved: true } : null);
        }
        
        // Invalidate cache
        const cacheKey = `${enterpriseId}_${targetUserId}`;
        enterpriseMealPlanCache.delete(cacheKey);
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to approve meal plan');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to approve meal plan');
      throw err;
    }
  }, [enterpriseId, currentPlan]);

  /**
   * Delete a meal plan
   */
  const deleteMealPlan = useCallback(async (planId: string, targetUserId: string) => {
    if (!enterpriseId) return;
    
    try {
      const result: any = await api.deleteUserMealPlan(enterpriseId, planId);
      
      if (result.success) {
        // Update local state
        setMealPlans(prev => prev.filter(plan => plan.id !== planId));
        
        if (currentPlan?.id === planId) {
          setCurrentPlan(null);
        }
        
        // Invalidate cache
        const cacheKey = `${enterpriseId}_${targetUserId}`;
        enterpriseMealPlanCache.delete(cacheKey);
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to delete meal plan');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to delete meal plan');
      throw err;
    }
  }, [enterpriseId, currentPlan]);

  /**
   * Select a meal plan
   */
  const selectMealPlan = useCallback((planId: string) => {
    const plan = mealPlans.find(p => p.id === planId);
    if (plan) {
      setCurrentPlan(plan);
    }
  }, [mealPlans]);

  /**
   * Refresh meal plans
   */
  const refreshMealPlans = useCallback(async (targetUserId: string) => {
    await loadMealPlans(targetUserId, true);
  }, [loadMealPlans]);

  // Load meal plans when userId changes
  useEffect(() => {
    if (userId) {
      loadMealPlans(userId);
    } else {
      setMealPlans([]);
      setCurrentPlan(null);
    }
    
    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId, loadMealPlans]);

  return {
    mealPlans,
    currentPlan,
    loading,
    error,
    loadMealPlans,
    createMealPlan,
    approveMealPlan,
    deleteMealPlan,
    selectMealPlan,
    refreshMealPlans,
    setCurrentPlan
  };
}

/**
 * Clear all enterprise meal plan caches
 */
export function clearEnterpriseMealPlanCache() {
  enterpriseMealPlanCache.clear();
}
