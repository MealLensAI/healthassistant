import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/utils';
import { api, APIError } from '@/lib/api';

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

function isStaleReadbackError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('stale data') ||
    lower.includes('row-level security') ||
    lower.includes('42501') ||
    lower.includes('tracking_persist_failed')
  );
}

export function useMealTracking(mealPlanId: string | null): UseMealTrackingReturn {
  const { token } = useAuth();
  const [tracking, setTracking] = useState<TrackingData>({});
  const [progress, setProgress] = useState<WeekProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackingRef = useRef<TrackingData>({});
  const progressRef = useRef<WeekProgress | null>(null);

  useEffect(() => {
    trackingRef.current = tracking;
  }, [tracking]);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const fetchTracking = useCallback(async (): Promise<TrackingData> => {
    if (!mealPlanId || !token) return {};

    setLoading(true);
    setError(null);

    try {
      const data = await api.get<{ status: string; tracking?: TrackingData; message?: string }>(
        `/meal_tracking/${mealPlanId}`,
        { timeout: 20000 }
      );

      if (data.status === 'success') {
        const next = data.tracking || {};
        setTracking(next);
        return next;
      }

      throw new Error(data.message || 'Failed to fetch tracking');
    } catch (err) {
      console.error('[useMealTracking] fetchTracking failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tracking');
      return trackingRef.current;
    } finally {
      setLoading(false);
    }
  }, [mealPlanId, token]);

  const fetchProgress = useCallback(async () => {
    if (!mealPlanId || !token) return;

    try {
      const data = await api.get<{ status: string; progress?: WeekProgress; message?: string }>(
        `/meal_tracking/week_progress/${mealPlanId}`,
        { timeout: 20000 }
      );

      if (data.status === 'success') {
        setProgress(data.progress || null);
      }
    } catch (err) {
      console.error('[useMealTracking] fetchProgress failed:', err);
    }
  }, [mealPlanId, token]);

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
      const data = await api.post<{
        status: string;
        message?: string;
        data?: { cooked_at?: string };
      }>(
        '/meal_tracking/mark_cooked',
        {
          meal_plan_id: mealPlanId,
          day,
          meal_type: mealType,
        },
        { timeout: 45000 }
      );

      if (data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to mark as cooked');
      }

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

      void fetchProgress();
      setError(null);
      return true;
    } catch (err) {
      const message =
        err instanceof APIError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to mark as cooked';

      // Some API responses report a verify/RLS failure even when the cook
      // write already landed. Re-read tracking and trust the server state.
      if (isStaleReadbackError(message)) {
        try {
          const latest = await fetchTracking();
          if (latest?.[day]?.[mealType]?.cooked_at) {
            void fetchProgress();
            setError(null);
            return true;
          }
        } catch {
          // fall through to rollback
        }
      }

      console.error('[useMealTracking] mark_cooked failed:', err);
      setTracking(previousTracking);
      setProgress(previousProgress);
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }, [mealPlanId, token, fetchProgress, fetchTracking]);

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
      const data = await api.post<{ status: string; message?: string }>(
        '/meal_tracking/unmark_cooked',
        {
          meal_plan_id: mealPlanId,
          day,
          meal_type: mealType,
        },
        { timeout: 30000 }
      );

      if (data?.status !== 'success') {
        throw new Error(data?.message || 'Failed to unmark meal');
      }

      void fetchProgress();
      setError(null);
      return true;
    } catch (err) {
      const message =
        err instanceof APIError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to unmark meal';

      if (isStaleReadbackError(message)) {
        try {
          const latest = await fetchTracking();
          if (!latest?.[day]?.[mealType]?.cooked_at) {
            void fetchProgress();
            setError(null);
            return true;
          }
        } catch {
          // fall through
        }
      }

      console.error('[useMealTracking] unmark_cooked failed:', err);
      setTracking(previousTracking);
      setProgress(previousProgress);
      setError(message);
      throw err instanceof Error ? err : new Error(message);
    }
  }, [mealPlanId, token, fetchProgress, fetchTracking]);

  const isMealCooked = useCallback((day: string, mealType: string): boolean => {
    return !!tracking[day]?.[mealType]?.cooked_at;
  }, [tracking]);

  useEffect(() => {
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
