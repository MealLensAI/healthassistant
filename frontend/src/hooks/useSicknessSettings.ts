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

/** Legacy global key — never read after scoping; cleared on logout. */
const LEGACY_SETTINGS_CACHE_KEY = 'meallensai_health_settings_v1';
const SETTINGS_CACHE_PREFIX = 'meallensai_health_settings_v1_';
const SETTINGS_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

const getSettingsCacheKey = (userId: string) => `${SETTINGS_CACHE_PREFIX}${userId}`;

const resolveUserId = (user?: { uid?: string } | null): string | undefined => {
  if (user?.uid) return user.uid;
  try {
    const raw = safeGetItem('user_data');
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return typeof parsed?.uid === 'string' ? parsed.uid : undefined;
  } catch {
    return undefined;
  }
};

const readCachedSettings = (userId?: string): SicknessSettings | null => {
  if (!userId) return null;
  try {
    const key = getSettingsCacheKey(userId);
    const raw = safeGetItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.timestamp !== 'number' || !payload.settings) return null;
    // Reject cache that belongs to a different user (defensive)
    if (payload.userId && payload.userId !== userId) {
      safeRemoveItem(key);
      return null;
    }
    if (Date.now() - payload.timestamp > SETTINGS_CACHE_TTL_MS) {
      safeRemoveItem(key);
      return null;
    }
    return normalizeSettings(payload.settings as Partial<SicknessSettings>);
  } catch {
    if (userId) safeRemoveItem(getSettingsCacheKey(userId));
    return null;
  }
};

const writeCachedSettings = (settings: SicknessSettings, userId?: string) => {
  if (!userId) return;
  try {
    safeSetItem(
      getSettingsCacheKey(userId),
      JSON.stringify({
        timestamp: Date.now(),
        userId,
        settings
      })
    );
  } catch {
    // ignore storage failures
  }
};

/** Parse API settings payload (object or JSON string) into usable data, or null. */
const parseSettingsPayload = (raw: unknown): Partial<SicknessSettings> | null => {
  let settingsToUse = raw;
  if (typeof settingsToUse === 'string') {
    try {
      settingsToUse = JSON.parse(settingsToUse);
    } catch {
      return null;
    }
  }
  if (
    !settingsToUse ||
    typeof settingsToUse !== 'object' ||
    Array.isArray(settingsToUse) ||
    Object.keys(settingsToUse as object).length === 0
  ) {
    return null;
  }
  return settingsToUse as Partial<SicknessSettings>;
};

/**
 * Seed per-user health-settings cache from a login prefetch so the dashboard
 * gate can resolve without flashing the incomplete-profile modal.
 */
export const seedHealthSettingsCache = (rawSettings: unknown, userId?: string): boolean => {
  const uid = userId || resolveUserId();
  if (!uid) return false;
  const parsed = parseSettingsPayload(rawSettings);
  if (!parsed) return false;
  const normalized = normalizeSettings(parsed);
  writeCachedSettings(normalized, uid);
  return true;
};

const dropCachedSettings = (userId?: string) => {
  if (userId) {
    safeRemoveItem(getSettingsCacheKey(userId));
  }
  // Always remove the legacy unscoped key so it cannot leak across accounts
  safeRemoveItem(LEGACY_SETTINGS_CACHE_KEY);
};

/** Clear all health-profile caches (call on logout). */
export const clearAllHealthSettingsCaches = () => {
  safeRemoveItem(LEGACY_SETTINGS_CACHE_KEY);
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(SETTINGS_CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => safeRemoveItem(key));
  } catch {
    // ignore
  }
};

export const useSicknessSettings = () => {
  // Cache is only for same-user instant display while fetching from Supabase
  const cacheRef = useRef<SicknessSettings | null>(null);
  const initialSettings = createEmptySettings();
  const previousUserIdRef = useRef<string | undefined>(undefined);

  const [settings, setSettings] = useState<SicknessSettings>(initialSettings);
  // Start true so gates never treat empty defaults as "checked incomplete"
  // before the backend (or cache) resolve.
  const [loading, setLoading] = useState(true);
  const [hasResolved, setHasResolved] = useState(false);
  const [hasExistingData, setHasExistingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const isMountedRef = useRef(true);
  const lastSavedRef = useRef<SicknessSettings>(initialSettings);
  const userId = resolveUserId(user);

  useEffect(() => {
    // Must re-assert true on setup — React Strict Mode runs cleanup then re-runs
    // effects on the same instance, which would otherwise leave this stuck false
    // and block the dashboard forever on hasResolved.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const persistCache = useCallback((data: SicknessSettings, forUserId?: string) => {
    const uid = forUserId || resolveUserId(user);
    const normalized = normalizeSettings(data);
    cacheRef.current = normalized;
    writeCachedSettings(normalized, uid);
  }, [user]);

  const clearCache = useCallback(() => {
    cacheRef.current = null;
    dropCachedSettings(previousUserIdRef.current || userId);
  }, [userId]);

  const resetToEmpty = useCallback(() => {
    const emptySettings = createEmptySettings();
    cacheRef.current = null;
    lastSavedRef.current = emptySettings;
    if (isMountedRef.current) {
      setSettings(emptySettings);
      setHasExistingData(false);
      setHasResolved(false);
      setError(null);
    }
  }, []);

  const loadSettingsFromBackend = useCallback(async (forceRefresh: boolean = false) => {
    const uid = resolveUserId(user);
    if (authLoading || !isAuthenticated || !uid) {
      if (isMountedRef.current) {
        setLoading(false);
        setHasResolved(true);
      }
      return;
    }

    // Same-user cache only — never show another account's profile
    if (cacheRef.current && !forceRefresh) {
      setSettings(cacheRef.current);
      lastSavedRef.current = cacheRef.current;
      setHasExistingData(true);
    }

    // Always fetch from backend when authenticated — Supabase is source of truth
    if (isMountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const result = await api.getUserSettings('health_profile') as any;
      const settingsToUse = parseSettingsPayload(result.settings);
      const isValidData = result.status === 'success' && !!settingsToUse;
      const isMounted = isMountedRef.current;

      if (isValidData && settingsToUse) {
        const normalized = normalizeSettings(settingsToUse);
        persistCache(normalized, uid);
        lastSavedRef.current = normalized;

        if (isMounted) {
          setSettings(normalized);
          setHasExistingData(true);
          setError(null);
        }
      } else {
        // No saved health profile for this user — empty defaults, not another user's cache
        dropCachedSettings(uid);
        cacheRef.current = null;
        const emptySettings = createEmptySettings();
        lastSavedRef.current = emptySettings;
        if (isMounted) {
          setSettings(emptySettings);
          setHasExistingData(false);
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        // Network error: only reuse cache if it belongs to this user
        const sameUserCache = cacheRef.current || readCachedSettings(uid);
        if (sameUserCache) {
          cacheRef.current = sameUserCache;
          setSettings(sameUserCache);
          lastSavedRef.current = sameUserCache;
          setHasExistingData(true);
          setError(null);
        } else {
          setError('Unable to load your health settings. Please try again.');
          setHasExistingData(false);
        }
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setHasResolved(true);
      }
    }
  }, [authLoading, isAuthenticated, persistCache, user]);

  useEffect(() => {
    if (authLoading) {
      if (isMountedRef.current) {
        setLoading(true);
        setHasResolved(false);
      }
      return;
    }

    if (!isAuthenticated || !userId) {
      // Logged out — wipe in-memory + local caches so the next account starts clean
      if (previousUserIdRef.current || hasExistingData || cacheRef.current) {
        dropCachedSettings(previousUserIdRef.current);
        previousUserIdRef.current = undefined;
        resetToEmpty();
      }
      if (isMountedRef.current) {
        setLoading(false);
        setHasResolved(true);
      }
      return;
    }

    // Account switch: never carry previous user's profile into the new session
    if (previousUserIdRef.current && previousUserIdRef.current !== userId) {
      dropCachedSettings(previousUserIdRef.current);
      cacheRef.current = null;
      resetToEmpty();
    }
    previousUserIdRef.current = userId;

    // Instant paint from this user's cache only, then always refresh from backend
    const cached = readCachedSettings(userId);
    if (cached) {
      cacheRef.current = cached;
      setSettings(cached);
      lastSavedRef.current = cached;
      setHasExistingData(true);
    } else {
      // No same-user cache — wait for backend; do not leave stale UI
      cacheRef.current = null;
    }

    if (isMountedRef.current) {
      setLoading(true);
      setHasResolved(false);
    }
    loadSettingsFromBackend(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, userId]);

  // Safety mechanism: Force reset loading/resolved if a fetch hangs
  useEffect(() => {
    if (loading || !hasResolved) {
      const timeout = setTimeout(() => {
        console.warn('⚠️ Health settings load stuck, forcing resolve');
        if (isMountedRef.current) {
          setLoading(false);
          setHasResolved(true);
        }
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [loading, hasResolved]);

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
        persistCache(updated, userId);
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
    hasResolved,
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
