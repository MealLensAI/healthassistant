import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/utils';
import { APP_CONFIG } from '@/lib/config';

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

const API_BASE_URL = APP_CONFIG.api.base_url ? `${APP_CONFIG.api.base_url}/api` : '/api';

const log = (...args: unknown[]) => {
  if (typeof window !== 'undefined' && (window as unknown as { __MEAL_TRACKING_DEBUG__?: boolean }).__MEAL_TRACKING_DEBUG__) {
    // eslint-disable-next-line no-console
    console.log('[useMealTracking]', ...args);
  }
};

async function parseJsonSafe(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { status: 'error', message: text.slice(0, 300) };
  }
}

function deriveProgressDelta(progress: WeekProgress | null, delta: number): WeekProgress | null {
  if (!progress) return progress;
  const total = progress.total_meals || 0;
  const cooked = Math.max(0, Math.min(total, progress.cooked_meals + delta));
  const pct = total > 0 ? Math.round((cooked / total) * 1000) / 10 : 0;
  return {
    total_meals: total,
    cooked_meals: cooked,
    progress_percentage: pct,
    is_complete: total > 0 && cooked >= total,
  };
}

export function useMealTracking(mealPlanId: string | null): UseMealTrackingReturn {
  const { token } = useAuth();
  const [tracking, setTracking] = useState<TrackingData>({});
  const [progress, setProgress] = useState<WeekProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep latest values available inside async callbacks without causing re-renders.
  const trackingRef = useRef<TrackingData>({});
  const progressRef = useRef<WeekProgress | null>(null);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

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
        const body = await parseJsonSafe(response);
        throw new Error(body?.message || `Failed to fetch tracking (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        setTracking(data.tracking || {});
      }
    } catch (err) {
      console.error('[useMealTracking] fetchTracking failed:', err);
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
        const body = await parseJsonSafe(response);
        throw new Error(body?.message || `Failed to fetch progress (HTTP ${response.status})`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        setProgress(data.progress);
      }
    } catch (err) {
      console.error('[useMealTracking] fetchProgress failed:', err);
    }
  }, [mealPlanId, token, getAuthHeaders]);

  const refreshTracking = useCallback(async () => {
    await Promise.all([fetchTracking(), fetchProgress()]);
  }, [fetchTracking, fetchProgress]);

  const markAsCooked = useCallback(async (day: string, mealType: string): Promise<boolean> => {
    if (!mealPlanId || !token) {
      setError('Not signed in or no active meal plan');
      return false;
    }

    const previousTracking = trackingRef.current;
    const previousProgress = progressRef.current;
    const wasCooked = !!previousTracking[day]?.[mealType]?.cooked_at;

    // Optimistic UI update so the bar and check mark move instantly.
    const optimisticCookedAt = new Date().toISOString();
    setTracking(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: {
          ...prev[day]?.[mealType],
          cooked_at: optimisticCookedAt,
          eaten_at: prev[day]?.[mealType]?.eaten_at ?? null,
          reminder_sent_at: prev[day]?.[mealType]?.reminder_sent_at ?? null,
        },
      },
    }));
    if (!wasCooked) {
      setProgress(p => deriveProgressDelta(p, +1));
    }

    try {
      log('mark_cooked →', { mealPlanId, day, mealType, url: `${API_BASE_URL}/meal_tracking/mark_cooked` });
      const response = await fetch(`${API_BASE_URL}/meal_tracking/mark_cooked`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          meal_plan_id: mealPlanId,
          day,
          meal_type: mealType,
        }),
      });

      const data = await parseJsonSafe(response);
      log('mark_cooked ←', response.status, data);

      if (!response.ok || data?.status !== 'success') {
        throw new Error(data?.message || `Failed to mark as cooked (HTTP ${response.status})`);
      }

      // Align local state with what the server actually saved.
      const serverCookedAt = data?.data?.cooked_at || optimisticCookedAt;
      setTracking(prev => ({
        ...prev,
        [day]: {
          ...prev[day],
          [mealType]: {
            ...prev[day]?.[mealType],
            cooked_at: serverCookedAt,
            eaten_at: prev[day]?.[mealType]?.eaten_at ?? null,
            reminder_sent_at: prev[day]?.[mealType]?.reminder_sent_at ?? null,
          },
        },
      }));

      // Confirm the bar with the canonical server count.
      void fetchProgress();
      setError(null);
      return true;
    } catch (err) {
      console.error('[useMealTracking] mark_cooked failed:', err);
      // Roll back optimistic state.
      setTracking(previousTracking);
      setProgress(previousProgress);
      setError(err instanceof Error ? err.message : 'Failed to mark as cooked');
      throw err instanceof Error ? err : new Error('Failed to mark as cooked');
    }
  }, [mealPlanId, token, getAuthHeaders, fetchProgress]);

  const unmarkAsCooked = useCallback(async (day: string, mealType: string): Promise<boolean> => {
    if (!mealPlanId || !token) {
      setError('Not signed in or no active meal plan');
      return false;
    }

    const previousTracking = trackingRef.current;
    const previousProgress = progressRef.current;
    const wasCooked = !!previousTracking[day]?.[mealType]?.cooked_at;

    setTracking(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [mealType]: {
          ...prev[day]?.[mealType],
          cooked_at: null,
          eaten_at: prev[day]?.[mealType]?.eaten_at ?? null,
          reminder_sent_at: prev[day]?.[mealType]?.reminder_sent_at ?? null,
        },
      },
    }));
    if (wasCooked) {
      setProgress(p => deriveProgressDelta(p, -1));
    }

    try {
      log('unmark_cooked →', { mealPlanId, day, mealType });
      const response = await fetch(`${API_BASE_URL}/meal_tracking/unmark_cooked`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          meal_plan_id: mealPlanId,
          day,
          meal_type: mealType,
        }),
      });

      const data = await parseJsonSafe(response);
      log('unmark_cooked ←', response.status, data);

      if (!response.ok || data?.status !== 'success') {
        throw new Error(data?.message || `Failed to unmark meal (HTTP ${response.status})`);
      }

      void fetchProgress();
      setError(null);
      return true;
    } catch (err) {
      console.error('[useMealTracking] unmark_cooked failed:', err);
      setTracking(previousTracking);
      setProgress(previousProgress);
      setError(err instanceof Error ? err.message : 'Failed to unmark meal');
      throw err instanceof Error ? err : new Error('Failed to unmark meal');
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
