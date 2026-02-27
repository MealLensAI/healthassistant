import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/lib/utils';

interface MealTrackingStatus {
  cooked_at: string | null;
  eaten_at: string | null;
  reminder_sent_at: string | null;
}

interface TrackingData {
  [day: string]: {
    [mealType: string]: MealTrackingStatus;
  };
}

interface WeekProgress {
  total_meals: number;
  cooked_meals: number;
  progress_percentage: number;
  is_complete: boolean;
}

interface UseMealTrackingReturn {
  tracking: TrackingData;
  progress: WeekProgress | null;
  loading: boolean;
  error: string | null;
  markAsCooked: (day: string, mealType: string) => Promise<boolean>;
  unmarkAsCooked: (day: string, mealType: string) => Promise<boolean>;
  isMealCooked: (day: string, mealType: string) => boolean;
  refreshTracking: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export function useMealTracking(mealPlanId: string | null): UseMealTrackingReturn {
  const { token } = useAuth();
  const [tracking, setTracking] = useState<TrackingData>({});
  const [progress, setProgress] = useState<WeekProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  const fetchTracking = useCallback(async () => {
    if (!mealPlanId || !token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/meal_tracking/${mealPlanId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tracking data');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setTracking(data.tracking || {});
      }
    } catch (err) {
      console.error('Error fetching meal tracking:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracking');
    } finally {
      setLoading(false);
    }
  }, [mealPlanId, token, getAuthHeaders]);

  const fetchProgress = useCallback(async () => {
    if (!mealPlanId || !token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/meal_tracking/week_progress/${mealPlanId}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch progress');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error('Error fetching week progress:', err);
    }
  }, [mealPlanId, token, getAuthHeaders]);

  const refreshTracking = useCallback(async () => {
    await Promise.all([fetchTracking(), fetchProgress()]);
  }, [fetchTracking, fetchProgress]);

  const markAsCooked = useCallback(async (day: string, mealType: string): Promise<boolean> => {
    if (!mealPlanId || !token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/meal_tracking/mark_cooked`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          meal_plan_id: mealPlanId,
          day,
          meal_type: mealType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark meal as cooked');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setTracking(prev => ({
          ...prev,
          [day]: {
            ...prev[day],
            [mealType]: {
              ...prev[day]?.[mealType],
              cooked_at: data.data?.cooked_at || new Date().toISOString(),
            },
          },
        }));
        
        await fetchProgress();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error marking meal as cooked:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as cooked');
      return false;
    }
  }, [mealPlanId, token, getAuthHeaders, fetchProgress]);

  const unmarkAsCooked = useCallback(async (day: string, mealType: string): Promise<boolean> => {
    if (!mealPlanId || !token) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/meal_tracking/unmark_cooked`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          meal_plan_id: mealPlanId,
          day,
          meal_type: mealType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to unmark meal');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setTracking(prev => ({
          ...prev,
          [day]: {
            ...prev[day],
            [mealType]: {
              ...prev[day]?.[mealType],
              cooked_at: null,
            },
          },
        }));
        
        await fetchProgress();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error unmarking meal:', err);
      setError(err instanceof Error ? err.message : 'Failed to unmark meal');
      return false;
    }
  }, [mealPlanId, token, getAuthHeaders, fetchProgress]);

  const isMealCooked = useCallback((day: string, mealType: string): boolean => {
    return !!tracking[day]?.[mealType]?.cooked_at;
  }, [tracking]);

  useEffect(() => {
    // Reset plan-specific state whenever user switches meal plans.
    setTracking({});
    setProgress(null);
    setError(null);
  }, [mealPlanId]);

  useEffect(() => {
    if (mealPlanId && token) {
      refreshTracking();
    }
  }, [mealPlanId, token, refreshTracking]);

  return {
    tracking,
    progress,
    loading,
    error,
    markAsCooked,
    unmarkAsCooked,
    isMealCooked,
    refreshTracking,
  };
}
