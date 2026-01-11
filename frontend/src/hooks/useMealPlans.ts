import { useState, useEffect } from 'react';
import { APP_CONFIG } from '@/lib/config';
import { safeGetItem, safeRemoveItem, useAuth } from '@/lib/utils';

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
  // Enhanced nutritional information
  breakfast_name?: string;
  breakfast_calories?: number;
  breakfast_protein?: number;
  breakfast_carbs?: number;
  breakfast_fat?: number;
  breakfast_benefit?: string;
  breakfast_image?: string; // Image URL stored in DB
  lunch_name?: string;
  lunch_calories?: number;
  lunch_protein?: number;
  lunch_carbs?: number;
  lunch_fat?: number;
  lunch_benefit?: string;
  lunch_image?: string; // Image URL stored in DB
  dinner_name?: string;
  dinner_calories?: number;
  dinner_protein?: number;
  dinner_carbs?: number;
  dinner_fat?: number;
  dinner_benefit?: string;
  dinner_image?: string; // Image URL stored in DB
  snack_name?: string;
  snack_calories?: number;
  snack_protein?: number;
  snack_carbs?: number;
  snack_fat?: number;
  snack_benefit?: string;
  snack_image?: string; // Image URL stored in DB
}

export interface HealthAssessment {
  whtr: number;
  whtr_category: string;
  bmr: number;
  daily_calories: number;
}

export interface SavedMealPlan {
  id: string;
  name: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  mealPlan: MealPlan[];
  createdAt: string;
  updatedAt: string;
  healthAssessment?: HealthAssessment; // Added for medical-grade plans
  userInfo?: any; // Store user health profile
  // Sickness tracking
  hasSickness?: boolean; // Whether plan was created with sickness settings
  sicknessType?: string; // Type of sickness when plan was created
}

// LocalStorage cache key (user-specific)
const getCacheKeys = (userId?: string) => {
  const userSuffix = userId ? `_${userId}` : '';
  return {
    plans: `meallensai_meal_plans_cache${userSuffix}`,
    timestamp: `meallensai_meal_plans_cache_timestamp${userSuffix}`
  };
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes - extended for better persistence

// Helper functions for caching
const getCachedPlans = (userId?: string): SavedMealPlan[] | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    
    const keys = getCacheKeys(userId);
    const cached = window.localStorage.getItem(keys.plans);
    const timestamp = window.localStorage.getItem(keys.timestamp);
    
    if (!cached || !timestamp) return null;
    
    const cacheAge = Date.now() - parseInt(timestamp, 10);
    if (cacheAge > CACHE_DURATION) {
      // Cache expired
      safeRemoveItem(keys.plans);
      safeRemoveItem(keys.timestamp);
      return null;
    }
    
    return JSON.parse(cached);
  } catch (error) {
    console.error('Error reading cached meal plans:', error);
    return null;
  }
};

const setCachedPlans = (plans: SavedMealPlan[], userId?: string) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys = getCacheKeys(userId);
      window.localStorage.setItem(keys.plans, JSON.stringify(plans));
      window.localStorage.setItem(keys.timestamp, Date.now().toString());
    }
  } catch (error) {
    console.error('Error caching meal plans:', error);
  }
};

const clearCachedPlans = (userId?: string) => {
  try {
    const keys = getCacheKeys(userId);
    safeRemoveItem(keys.plans);
    safeRemoveItem(keys.timestamp);
  } catch (error) {
    console.error('Error clearing cached meal plans:', error);
  }
};

export const useMealPlans = (filterBySickness?: boolean) => {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<SavedMealPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user ID for cache key
  const userId = user?.uid || (safeGetItem('user_data') ? JSON.parse(safeGetItem('user_data') || '{}')?.uid : undefined);

  // Load cached data immediately on mount (before auth check)
  useEffect(() => {
    // Try to load from cache first for instant display
    const cachedPlans = getCachedPlans(userId);
    if (cachedPlans && cachedPlans.length > 0) {
      // Filter cached plans if needed
      let filteredCached = cachedPlans;
      if (filterBySickness !== undefined) {
        filteredCached = cachedPlans.filter((plan: SavedMealPlan) => plan.hasSickness === filterBySickness);
      }
      setSavedPlans(filteredCached);
      if (filteredCached.length > 0) {
        setCurrentPlan(filteredCached[0]);
      }
    }
  }, [userId]); // Run when userId changes

  // Fetch all meal plans from backend API on mount
  // BUT ONLY when authentication is ready AND cache is expired/missing!
  useEffect(() => {
      // Don't fetch if not authenticated or auth still loading
      if (!isAuthenticated || authLoading) {
      // Don't clear cached data if auth is still loading
      if (!isAuthenticated) {
        setSavedPlans([]);
        setCurrentPlan(null);
        clearCachedPlans(userId);
      }
      setInitialized(false);
      setLoading(false);
      setError(null);
      return;
    }

    // Show cached data immediately if available (for better UX), but always fetch from backend
    const cachedPlans = getCachedPlans(userId);
    if (cachedPlans && cachedPlans.length > 0) {
      // Filter cached plans if needed
      let filteredCached = cachedPlans;
      if (filterBySickness !== undefined) {
        filteredCached = cachedPlans.filter((plan: SavedMealPlan) => plan.hasSickness === filterBySickness);
      }
      setSavedPlans(filteredCached);
      if (filteredCached.length > 0) {
        setCurrentPlan(filteredCached[0]);
      }
      // Continue to fetch from backend - don't return early
    }

    const fetchPlans = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = safeGetItem('access_token');
        const response = await fetch(`${APP_CONFIG.api.base_url}/api/meal_plan`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === 'success' && result.meal_plans) {
          const plans = result.meal_plans.map((plan: any) => ({
            id: plan.id,
            name: plan.name,
            startDate: plan.start_date,
            endDate: plan.end_date,
            mealPlan: plan.meal_plan,
            createdAt: plan.created_at,
            updatedAt: plan.updated_at,
            healthAssessment: plan.health_assessment,
            userInfo: plan.user_info,
            hasSickness: plan.has_sickness || false,
            sicknessType: plan.sickness_type || ''
          }));
          // Filter plans based on sickness profile
          let filteredPlans = plans;
          if (filterBySickness !== undefined) {
            filteredPlans = plans.filter((plan: SavedMealPlan) => plan.hasSickness === filterBySickness);
          }

          // Cache the plans
          setCachedPlans(plans, userId);
          
          setSavedPlans(filteredPlans);
          if (filteredPlans.length > 0) setCurrentPlan(filteredPlans[0]);
          // Clear any previous errors when data loads successfully
          setError(null);
        } else {
          console.error('Error fetching meal plans:', result.message);
          setSavedPlans([]);
          setCurrentPlan(null);
          clearCachedPlans(userId);
          setError(result.message || 'Failed to load meal plans');
        }
      } catch (error) {
        console.error('Error fetching meal plans:', error);
        // Don't clear cached data on error - keep showing it
        setError(error instanceof Error ? error.message : 'Failed to load meal plans');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };
    fetchPlans();
  }, [filterBySickness, isAuthenticated, authLoading]);

  const generateWeekDates = (startDate: Date): { startDate: string; endDate: string; name: string } => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      name: `${formatDate(startDate)} - ${formatDate(endDate)}`
    };
  };

  const saveMealPlan = async (mealPlan: MealPlan[], startDate?: Date, healthAssessment?: HealthAssessment, userInfo?: any, sicknessSettings?: { hasSickness: boolean; sicknessType: string }) => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const weekDates = startDate ? generateWeekDates(startDate) : generateWeekDates(now);

      // Fetch and attach images to meal plan before saving
      const mealPlanWithImages = await Promise.all(mealPlan.map(async (dayPlan) => {
        const { imageCache } = await import('@/lib/imageCache');
        const fallbackImages = {
          breakfast: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
          lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
          dinner: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400&h=300&fit=crop',
          snack: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop'
        };

        const updatedPlan = { ...dayPlan };

        // Fetch images for each meal if not already present
        if (dayPlan.breakfast_name && !dayPlan.breakfast_image) {
          updatedPlan.breakfast_image = await imageCache.getImage(dayPlan.breakfast_name, fallbackImages.breakfast);
        }
        if (dayPlan.lunch_name && !dayPlan.lunch_image) {
          updatedPlan.lunch_image = await imageCache.getImage(dayPlan.lunch_name, fallbackImages.lunch);
        }
        if (dayPlan.dinner_name && !dayPlan.dinner_image) {
          updatedPlan.dinner_image = await imageCache.getImage(dayPlan.dinner_name, fallbackImages.dinner);
        }
        if (dayPlan.snack_name && !dayPlan.snack_image) {
          updatedPlan.snack_image = await imageCache.getImage(dayPlan.snack_name, fallbackImages.snack);
        }

        return updatedPlan;
      }));

      const planData = {
        name: weekDates.name,
        start_date: weekDates.startDate,
        end_date: weekDates.endDate,
        meal_plan: mealPlanWithImages, // Save meal plan with images
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        health_assessment: healthAssessment,
        user_info: userInfo,
        has_sickness: sicknessSettings?.hasSickness || false,
        sickness_type: sicknessSettings?.sicknessType || ''
      };

      console.log('[DEBUG] Sending meal plan data:', planData);

      const token = safeGetItem('access_token');
      console.log('[DEBUG] Using access token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

      const response = await fetch(`${APP_CONFIG.api.base_url}/api/meal_plan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify(planData)
      });

      if (!response.ok) {
        // Try to parse the error message from the response
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorCode = null;
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorData && errorData.code) {
            errorCode = errorData.code;
          }
        } catch (e) {
          // If we can't parse the response as JSON, use the generic error
        }
        
        // Handle duplicate plan error (409 Conflict)
        if (response.status === 409 || errorCode === 'DUPLICATE_PLAN') {
          const duplicateError: any = new Error(errorMessage);
          duplicateError.code = 'DUPLICATE_PLAN';
          duplicateError.status = 409;
          throw duplicateError;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.status === 'success' && result.data) {
        const newPlan: SavedMealPlan = {
          id: result.data.id,
          name: result.data.name,
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          mealPlan: result.data.mealPlan,
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
          healthAssessment: result.data.healthAssessment,
          userInfo: result.data.userInfo,
          hasSickness: sicknessSettings?.hasSickness || false,
          sicknessType: sicknessSettings?.sicknessType || ''
        };
          setSavedPlans(prev => {
            const updated = [newPlan, ...prev];
            // Update cache
            setCachedPlans(updated, userId);
            return updated;
          });
        setCurrentPlan(newPlan);
        // Force refresh to get latest from backend after save
        await refreshMealPlans(true);
        return newPlan;
      } else {
        throw new Error(result.message || 'Failed to save meal plan');
      }
    } catch (error) {
      console.error('Error saving meal plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to save meal plan');
      throw error;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const updateMealPlan = async (id: string, mealPlan: MealPlan[]) => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const token = safeGetItem('access_token');
      const response = await fetch(`${APP_CONFIG.api.base_url}/api/meal_plans/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({
          meal_plan: mealPlan,
          updated_at: now.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        // Update local state
        setSavedPlans(prev => {
          const updated = prev.map(plan => plan.id === id ? {
            ...plan,
            mealPlan: mealPlan,
            updatedAt: now.toISOString(),
          } : plan);
          // Update cache
          setCachedPlans(updated, userId);
          return updated;
        });
        setCurrentPlan(prev => prev?.id === id ? {
          ...prev,
          mealPlan: mealPlan,
          updatedAt: now.toISOString(),
        } : prev);
        // Force refresh to get latest from backend after update
        await refreshMealPlans(true);
      } else {
        throw new Error(result.message || 'Failed to update meal plan');
      }
    } catch (error) {
      console.error('Error updating meal plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to update meal plan');
      throw error;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const deleteMealPlan = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = safeGetItem('access_token');
      const response = await fetch(`${APP_CONFIG.api.base_url}/api/meal_plans/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        setSavedPlans(prev => {
          const remainingPlans = prev.filter(plan => plan.id !== id);
          setCurrentPlan(remainingPlans.length > 0 ? remainingPlans[0] : null);
          // Update cache
          setCachedPlans(remainingPlans, userId);
          return remainingPlans;
        });
        // Force refresh to get latest from backend after delete
        await refreshMealPlans(true);
      } else {
        throw new Error(result.message || 'Failed to delete meal plan');
      }
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete meal plan');
      throw error;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const selectMealPlan = (id: string) => {
    const plan = savedPlans.find(p => p.id === id);
    if (plan) {
      setCurrentPlan(plan);
    } else {
      console.error('[DEBUG] Plan not found for id:', id);
    }
  };

  const duplicateMealPlan = async (id: string, newStartDate: Date) => {
    const originalPlan = savedPlans.find(p => p.id === id);
    if (!originalPlan) return;

    const weekDates = generateWeekDates(newStartDate);
    const now = new Date();

    const planData = {
      name: weekDates.name,
      start_date: weekDates.startDate,
      end_date: weekDates.endDate,
      meal_plan: originalPlan.mealPlan,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      has_sickness: originalPlan.hasSickness || false,
      sickness_type: originalPlan.sicknessType || ''
    };

    const token = safeGetItem('access_token');
    const response = await fetch(`${APP_CONFIG.api.base_url}/api/meal_plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      credentials: 'include',
      body: JSON.stringify(planData)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (result.status === 'success' && result.data) {
      const duplicatedPlan: SavedMealPlan = {
        id: result.data.id,
        name: result.data.name,
        startDate: result.data.startDate,
        endDate: result.data.endDate,
        mealPlan: result.data.mealPlan,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
        hasSickness: originalPlan.hasSickness || false,
        sicknessType: originalPlan.sicknessType || ''
      };
      setSavedPlans(prev => {
        const updated = [duplicatedPlan, ...prev];
        // Update cache
        setCachedPlans(updated, userId);
        return updated;
      });
      setCurrentPlan(duplicatedPlan);
      return duplicatedPlan;
    } else {
      throw new Error(result.message || 'Failed to duplicate meal plan');
    }
  };

  const clearAllPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = safeGetItem('access_token');
      const response = await fetch(`${APP_CONFIG.api.base_url}/api/meal_plans/clear`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success') {
        setSavedPlans([]);
        setCurrentPlan(null);
      } else {
        throw new Error(result.message || 'Failed to clear meal plans');
      }
    } catch (error) {
      console.error('Error clearing all meal plans:', error);
      setError(error instanceof Error ? error.message : 'Failed to clear meal plans');
      throw error;
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const refreshMealPlans = async (forceRefresh: boolean = false) => {
    if (!isAuthenticated) {
      console.log('⏸️ useMealPlans: Cannot refresh (not authenticated)');
      return;
    }

    // Show cached data immediately if available (for better UX), but always fetch from backend
    const cachedPlans = getCachedPlans(userId);
    if (cachedPlans && cachedPlans.length > 0 && !forceRefresh) {
      console.log('✅ useMealPlans: Showing cached data, fetching fresh data from backend...');
      let filteredCached = cachedPlans;
      if (filterBySickness !== undefined) {
        filteredCached = cachedPlans.filter((plan: SavedMealPlan) => plan.hasSickness === filterBySickness);
      }
      setSavedPlans(filteredCached);
      if (filteredCached.length > 0) setCurrentPlan(filteredCached[0]);
      // Continue to fetch from backend - don't return early
    }

    setLoading(true);
    setError(null);
    try {
      const token = safeGetItem('access_token');
      const response = await fetch(`${APP_CONFIG.api.base_url}/api/meal_plan`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'success' && result.meal_plans) {
        const plans = result.meal_plans.map((plan: any) => ({
          id: plan.id,
          name: plan.name,
          startDate: plan.start_date,
          endDate: plan.end_date,
          mealPlan: plan.meal_plan,
          createdAt: plan.created_at,
          updatedAt: plan.updated_at,
          healthAssessment: plan.health_assessment,
          userInfo: plan.user_info,
          hasSickness: plan.has_sickness || false,
          sicknessType: plan.sickness_type || ''
        }));
        // Filter plans based on sickness profile
        let filteredPlans = plans;
        if (filterBySickness !== undefined) {
          filteredPlans = plans.filter((plan: SavedMealPlan) => plan.hasSickness === filterBySickness);
        }

        // Update cache
        setCachedPlans(plans, userId);
        
        setSavedPlans(filteredPlans);
        setCurrentPlan(filteredPlans.length > 0 ? filteredPlans[0] : null);
        // Clear any previous errors when data loads successfully
        setError(null);
      } else {
        setSavedPlans([]);
        setCurrentPlan(null);
        setError(result.message || 'Failed to refresh meal plans');
      }
    } catch (error) {
      console.error('Error refreshing meal plans:', error);
      setSavedPlans([]);
      setCurrentPlan(null);
      setError(error instanceof Error ? error.message : 'Failed to refresh meal plans');
    }
    setLoading(false);
    setInitialized(true);
  };

  return {
    savedPlans,
    currentPlan,
    loading,
    initialized,
    error,
    saveMealPlan,
    updateMealPlan,
    deleteMealPlan,
    selectMealPlan,
    duplicateMealPlan,
    clearAllPlans,
    generateWeekDates,
    refreshMealPlans,
  };
}; 