import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth, safeGetItem, safeRemoveItem, safeSetItem } from '@/lib/utils';

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
  hasSickness: true,  // Default to yes, this is a health-focused app
  sicknessType: '',
  age: undefined,
  gender: undefined,
  height: undefined,
  weight: undefined,
  waist: undefined,
  activityLevel: undefined,
  goal: undefined,
  location: undefined
};

const createEmptySettings = (): SicknessSettings => ({
  ...DEFAULT_SETTINGS
});

const normalizeSettings = (incoming?: Partial<SicknessSettings> | null): SicknessSettings => {
  const normalized = {
    ...DEFAULT_SETTINGS,
    ...(incoming || {})
  };
  // Always default to hasSickness: true for health-focused app
  normalized.hasSickness = true;
  return normalized;
};

const SETTINGS_CACHE_KEY = 'meallensai_health_settings_v1';
const SETTINGS_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const readCachedSettings = (): SicknessSettings | null => {
  try {
    const raw = safeGetItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.timestamp !== 'number' || !payload.settings) return null;
    if (Date.now() - payload.timestamp > SETTINGS_CACHE_TTL_MS) {
      safeRemoveItem(SETTINGS_CACHE_KEY);
      return null;
    }
    return normalizeSettings(payload.settings as Partial<SicknessSettings>);
  } catch {
    safeRemoveItem(SETTINGS_CACHE_KEY);
    return null;
  }
};

const writeCachedSettings = (settings: SicknessSettings) => {
  try {
    safeSetItem(
      SETTINGS_CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        settings
      })
    );
  } catch {
    // ignore storage failures
  }
};

const dropCachedSettings = () => {
  safeRemoveItem(SETTINGS_CACHE_KEY);
};

export const useSicknessSettings = () => {
  const cacheRef = useRef<SicknessSettings | null>(readCachedSettings());
  const initialSettings = cacheRef.current ? cacheRef.current : createEmptySettings();

  const [settings, setSettings] = useState<SicknessSettings>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(!!cacheRef.current);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const isMountedRef = useRef(true);
  const lastSavedRef = useRef<SicknessSettings>(initialSettings);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const persistCache = useCallback((data: SicknessSettings) => {
    const normalized = normalizeSettings(data);
    cacheRef.current = normalized;
    writeCachedSettings(normalized);
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current = null;
    dropCachedSettings();
  }, []);

  const loadSettingsFromBackend = useCallback(async () => {
    if (authLoading || !isAuthenticated) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }

    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await api.getUserSettings('health_profile');
      if (!isMountedRef.current) return;

      const hasData =
        result.status === 'success' &&
        typeof result.settings === 'object' &&
        result.settings !== null &&
        Object.keys(result.settings).length > 0;

      if (hasData) {
        const normalized = normalizeSettings(result.settings);
        setSettings(normalized);
        lastSavedRef.current = normalized;
        setHasExistingData(true);
        persistCache(normalized);
        setError(null);
        console.log('✅ Health settings loaded from backend:', normalized);
      } else {
        console.log('No health settings found in backend, preserving cached/default values');
        if (!cacheRef.current) {
          const emptySettings = createEmptySettings();
          setSettings(emptySettings);
          lastSavedRef.current = emptySettings;
          setHasExistingData(false);
        }
        if (!cacheRef.current) {
          clearCache();
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        console.error('Error loading sickness settings from API:', err);
        setError('Unable to load your health settings. Please try again.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, persistCache, clearCache]);

  useEffect(() => {
    // Only load settings when authenticated and not loading
    if (!authLoading && isAuthenticated) {
      loadSettingsFromBackend();
    }
  }, [authLoading, isAuthenticated, loadSettingsFromBackend]);

  // Safety mechanism: Force reset loading state after 10 seconds
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Loading state stuck, forcing reset');
        if (isMountedRef.current) {
          setLoading(false);
        }
      }, 10000); // 10 seconds

      return () => clearTimeout(timeout);
    }
  }, [loading]);

  const updateSettings = (newSettings: Partial<SicknessSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const resetToLastSaved = useCallback(() => {
    setSettings({ ...lastSavedRef.current });
  }, []);

  const saveSettings = async (newSettings: SicknessSettings) => {
    const payload = normalizeSettings(newSettings);
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await api.saveUserSettings('health_profile', payload);

      if (result.status === 'success') {
        // Use the payload (what we sent) as the source of truth, but merge with any server response
        // This ensures hasSickness and all other fields are preserved
        const serverSettings = result.settings || {};
        const updated = normalizeSettings({
          ...payload,
          ...serverSettings, // Server response takes precedence for any fields it provides
          hasSickness: payload.hasSickness !== undefined ? payload.hasSickness : (serverSettings.hasSickness || false)
        });
        console.log('✅ Health settings saved. Payload:', payload);
        console.log('✅ Server response:', serverSettings);
        console.log('✅ Final normalized settings:', updated);
        lastSavedRef.current = updated;
        setSettings(updated);
        setHasExistingData(true);
        persistCache(updated);
        setError(null);
        console.log('✅ Health settings saved to backend successfully');
        return { success: true };
      } else {
        const message = result.message || 'Failed to save settings';
        setError(message);
        return { success: false, error: message };
      }
    } catch (error: any) {
      console.error('❌ Error saving sickness settings:', error);
      const message = error?.message || 'Failed to save settings';
      if (isMountedRef.current) {
        setError(message);
      }
      return { success: false, error: message };
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const getSicknessInfo = () => {
    if (!settings.hasSickness) {
      return null;
    }
    return {
      hasSickness: true,
      sicknessType: settings.sicknessType,
      age: settings.age,
      gender: settings.gender,
      height: settings.height,
      weight: settings.weight,
      waist: settings.waist,
      activityLevel: settings.activityLevel,
      goal: settings.goal,
      location: settings.location
    };
  };

  const getHealthProfilePayload = () => {
    if (
      !settings.hasSickness ||
      !settings.age ||
      !settings.gender ||
      !settings.height ||
      !settings.weight ||
      !settings.waist ||
      !settings.activityLevel ||
      !settings.goal ||
      !settings.location
    ) {
      return null;
    }
    return {
      age: settings.age,
      weight: settings.weight,
      height: settings.height,
      waist: settings.waist,
      gender: settings.gender,
      activity_level: settings.activityLevel,
      condition: settings.sicknessType,
      goal: settings.goal,
      location: settings.location
    };
  };

  const isHealthProfileComplete = () => {
    return (
      settings.hasSickness &&
      !!settings.age &&
      !!settings.gender &&
      !!settings.height &&
      !!settings.weight &&
      !!settings.waist &&
      !!settings.activityLevel &&
      !!settings.goal &&
      !!settings.sicknessType &&
      !!settings.location
    );
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    saveSettings,
    resetToLastSaved,
    hasExistingData,
    getSicknessInfo,
    getHealthProfilePayload,
    isHealthProfileComplete,
    reloadSettings: loadSettingsFromBackend
  };
};
