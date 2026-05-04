import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStore = new Map<string, string>();

export async function safeGetItem(key: string): Promise<string | null> {
  try {
    const val = await AsyncStorage.getItem(key);
    if (val !== null) return val;
  } catch {
    // fall back
  }
  return memoryStore.has(key) ? memoryStore.get(key)! : null;
}

export async function safeSetItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
    return;
  } catch {
    // fall back
  }
  memoryStore.set(key, value);
}

export async function safeRemoveItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
  memoryStore.delete(key);
}

export const STORAGE_KEYS = {
  TOKEN: 'access_token',
  USER: 'user_data',
  REFRESH_TOKEN: 'supabase_refresh_token',
  SESSION_ID: 'supabase_session_id',
  USER_ID: 'supabase_user_id',
  HEALTH_SETTINGS: 'meallensai_health_settings_v1',
  MEAL_PLANS_CACHE: 'meallensai_meal_plans_cache',
  HISTORY_CACHE: 'meallensai_history_cache',
  ACCESS_STATUS: 'meallensai_user_access_status',
  TRIAL_START: 'meallensai_trial_start',
  SUBSCRIPTION_STATUS: 'meallensai_subscription_status',
  SUBSCRIPTION_EXPIRES_AT: 'meallensai_subscription_expires_at',
} as const;

// Synchronous cache layer for immediate reads during renders
const syncCache = new Map<string, string>();

export function primeSyncCache(entries: Record<string, string | null | undefined>): void {
  for (const [key, value] of Object.entries(entries)) {
    if (value) syncCache.set(key, value);
    else syncCache.delete(key);
  }
}

export function getSync(key: string): string | null {
  return syncCache.has(key) ? syncCache.get(key)! : null;
}

export async function hydrateSyncCache(keys: string[]): Promise<void> {
  const entries = await AsyncStorage.multiGet(keys);
  for (const [k, v] of entries) {
    if (v !== null) syncCache.set(k, v);
  }
}

export async function setSync(key: string, value: string): Promise<void> {
  syncCache.set(key, value);
  await safeSetItem(key, value);
}

export async function removeSync(key: string): Promise<void> {
  syncCache.delete(key);
  await safeRemoveItem(key);
}
