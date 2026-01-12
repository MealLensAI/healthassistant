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
  // Don't read from cache on initialization - always fetch from backend
  // Cache is only used for immediate display while fetching
  const cacheRef = useRef<SicknessSettings | null>(null);
  const initialSettings = createEmptySettings();
  const previousUserIdRef = useRef<string | undefined>(undefined);

  const [settings, setSettings] = useState<SicknessSettings>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
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

  const loadSettingsFromBackend = useCallback(async (forceRefresh: boolean = false) => {
    if (authLoading || !isAuthenticated) {
      if (isMountedRef.current) {
        setLoading(false);
      }
      return;
    }

    // Show cached data immediately if available (for better UX), but always fetch from backend
    if (cacheRef.current && !forceRefresh) {
      setSettings(cacheRef.current);
      lastSavedRef.current = cacheRef.current;
      setHasExistingData(true);
    }

    // Always fetch from backend when authenticated to ensure we have the latest data
    // This ensures health info persists even after cache clear
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await api.getUserSettings('health_profile') as any;

      // Handle case where settings might be a string
      let settingsToUse = result.settings;
      if (typeof result.settings === 'string') {
        try {
          settingsToUse = JSON.parse(result.settings);
        } catch (e) {
          settingsToUse = {};
        }
      }

      // If backend returned success and we have a settings object with data, use it
      const isValidData = result.status === 'success' && 
          settingsToUse && 
          typeof settingsToUse === 'object' && 
          !Array.isArray(settingsToUse) &&
          Object.keys(settingsToUse).length > 0;

      const isMounted = isMountedRef.current;

      if (isValidData) {
        // Backend has data - use it
        const normalized = normalizeSettings(settingsToUse);
        
        // Always cache the data (safe even if unmounted)
        persistCache(normalized);
        lastSavedRef.current = normalized;
        
        // Only update state if component is still mounted
        if (isMounted) {
          setSettings(normalized);
          setHasExistingData(true);
          setError(null);
        }
      } else {
        // No valid backend data - use cache if available, otherwise empty
        if (cacheRef.current) {
          lastSavedRef.current = cacheRef.current;
          if (isMounted) {
            setSettings(cacheRef.current);
            setHasExistingData(true);
          }
        } else {
          const emptySettings = createEmptySettings();
          lastSavedRef.current = emptySettings;
          if (isMounted) {
            setSettings(emptySettings);
            setHasExistingData(false);
          }
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        // On error, try to use cached data if available
        if (cacheRef.current) {
          setSettings(cacheRef.current);
          lastSavedRef.current = cacheRef.current;
          setHasExistingData(true);
          setError(null);
        } else {
          setError('Unable to load your health settings. Please try again.');
          setHasExistingData(false);
        }
        setLoading(false);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [authLoading, isAuthenticated, persistCache]);

  useEffect(() => {
    // Only load settings when authenticated and not loading
    // Always fetch from backend when authenticated to ensure data is fresh
    if (!authLoading && isAuthenticated) {
      // Load cached data for immediate display (if available) - this prevents flickering
      const cached = readCachedSettings();
      if (cached) {
        cacheRef.current = cached;
        // Only set cached data if we don't already have backend data loaded
        // This ensures settings persist and don't reset to defaults
        if (!hasExistingData) {
          setSettings(cached);
          lastSavedRef.current = cached;
          setHasExistingData(true);
        }
      }
      // Always fetch from backend to ensure we have the latest data
      // Force refresh on authentication to ensure we get fresh data
      loadSettingsFromBackend(true);
    } else if (!isAuthenticated && !authLoading) {
      // Clear cache when user logs out
      cacheRef.current = null;
      dropCachedSettings();
      // Only clear settings when user logs out - don't reset if they're just not authenticated yet
      if (hasExistingData) {
        setSettings(createEmptySettings());
        lastSavedRef.current = createEmptySettings();
        setHasExistingData(false);
        clearCache();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated]);

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
