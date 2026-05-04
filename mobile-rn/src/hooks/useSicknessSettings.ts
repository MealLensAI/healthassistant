import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { safeGetItem, safeRemoveItem, safeSetItem, STORAGE_KEYS } from '@/lib/storage';
import { useAuth } from '@/lib/auth';

export interface SicknessSettings {
  hasSickness: boolean;
  sicknessType: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height?: number;
  weight?: number;
  waist?: number;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal?: string;
  location?: string;
}

const DEFAULT_SETTINGS: SicknessSettings = {
  hasSickness: true,
  sicknessType: '',
};

const TTL_MS = 1000 * 60 * 60 * 24 * 7;

const normalize = (incoming?: Partial<SicknessSettings> | null): SicknessSettings => {
  const merged = { ...DEFAULT_SETTINGS, ...(incoming || {}) };
  merged.hasSickness = true;
  return merged;
};

export const useSicknessSettings = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<SicknessSettings>({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const readCached = useCallback(async (): Promise<SicknessSettings | null> => {
    try {
      const raw = await safeGetItem(STORAGE_KEYS.HEALTH_SETTINGS);
      if (!raw) return null;
      const payload = JSON.parse(raw);
      if (!payload || typeof payload !== 'object') return null;
      if (typeof payload.timestamp !== 'number' || !payload.settings) return null;
      if (Date.now() - payload.timestamp > TTL_MS) {
        await safeRemoveItem(STORAGE_KEYS.HEALTH_SETTINGS);
        return null;
      }
      return normalize(payload.settings);
    } catch {
      return null;
    }
  }, []);

  const writeCache = useCallback(async (s: SicknessSettings) => {
    try {
      await safeSetItem(
        STORAGE_KEYS.HEALTH_SETTINGS,
        JSON.stringify({ timestamp: Date.now(), settings: s })
      );
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (authLoading || !isAuthenticated) {
        if (mounted.current) setLoading(false);
        return;
      }
      if (!forceRefresh) {
        const cached = await readCached();
        if (cached && mounted.current) {
          setSettings(cached);
          setHasExistingData(true);
        }
      }
      try {
        if (mounted.current) setLoading(true);
        const result: any = await api.getUserSettings('health_profile');
        let settingsToUse = result?.settings;
        if (typeof settingsToUse === 'string') {
          try {
            settingsToUse = JSON.parse(settingsToUse);
          } catch {
            settingsToUse = {};
          }
        }
        const valid =
          result?.status === 'success' &&
          settingsToUse &&
          typeof settingsToUse === 'object' &&
          !Array.isArray(settingsToUse) &&
          Object.keys(settingsToUse).length > 0;
        if (valid) {
          const normalized = normalize(settingsToUse);
          await writeCache(normalized);
          if (mounted.current) {
            setSettings(normalized);
            setHasExistingData(true);
            setError(null);
          }
        } else if (mounted.current) {
          setHasExistingData(false);
        }
      } catch (err: any) {
        if (mounted.current) setError(err?.message || 'Unable to load health settings.');
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [authLoading, isAuthenticated, readCached, writeCache]
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      load(false);
    } else if (!authLoading && !isAuthenticated) {
      setSettings({ ...DEFAULT_SETTINGS });
      setHasExistingData(false);
    }
  }, [authLoading, isAuthenticated, load]);

  const updateSettings = (next: Partial<SicknessSettings>) => {
    setSettings((prev) => normalize({ ...prev, ...next }));
  };

  const saveSettings = async (next: SicknessSettings) => {
    const payload = normalize(next);
    if (mounted.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const result: any = await api.saveUserSettings('health_profile', payload);
      if (result?.status === 'success') {
        const server = result.settings || {};
        const merged = normalize({ ...payload, ...server });
        await writeCache(merged);
        if (mounted.current) {
          setSettings(merged);
          setHasExistingData(true);
          setError(null);
        }
        return { success: true };
      }
      const msg = result?.message || 'Failed to save settings';
      if (mounted.current) setError(msg);
      return { success: false, error: msg };
    } catch (err: any) {
      const msg = err?.message || 'Failed to save settings';
      if (mounted.current) setError(msg);
      return { success: false, error: msg };
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const isHealthProfileComplete = () =>
    !!(
      settings.hasSickness &&
      settings.age &&
      settings.gender &&
      settings.height &&
      settings.weight &&
      settings.waist &&
      settings.activityLevel &&
      settings.goal &&
      settings.sicknessType &&
      settings.location
    );

  const getHealthProfilePayload = () =>
    !isHealthProfileComplete()
      ? null
      : {
          age: settings.age,
          weight: settings.weight,
          height: settings.height,
          waist: settings.waist,
          gender: settings.gender,
          activity_level: settings.activityLevel,
          condition: settings.sicknessType,
          goal: settings.goal,
          location: settings.location,
        };

  return {
    settings,
    updateSettings,
    saveSettings,
    loading,
    error,
    hasExistingData,
    isHealthProfileComplete,
    getHealthProfilePayload,
    reloadSettings: load,
  };
};
