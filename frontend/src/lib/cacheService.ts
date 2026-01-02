/**
 * Centralized Cache Service
 * Manages application-wide caching to prevent unnecessary re-downloading on login
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId?: string;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  key: string;
}

class CacheService {
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes default
  private readonly USER_PREFIX = 'meallensai_cache_';

  /**
   * Get cached data
   */
  get<T>(key: string, userId?: string): T | null {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;

      const cacheKey = this.getCacheKey(key, userId);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - entry.timestamp > this.DEFAULT_TTL) {
        this.remove(key, userId);
        return null;
      }

      // Verify user matches if userId was provided
      if (userId && entry.userId && entry.userId !== userId) {
        this.remove(key, userId);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error(`Error reading cache for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set cached data
   */
  set<T>(key: string, data: T, userId?: string, ttl?: number): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const cacheKey = this.getCacheKey(key, userId);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        userId,
      };

      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.error(`Error setting cache for key "${key}":`, error);
      // If quota exceeded, try to clear old entries
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.clearOldEntries();
      }
    }
  }

  /**
   * Remove cached data
   */
  remove(key: string, userId?: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const cacheKey = this.getCacheKey(key, userId);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.error(`Error removing cache for key "${key}":`, error);
    }
  }

  /**
   * Clear all cache for a user
   */
  clearUserCache(userId?: string): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const prefix = userId ? `${this.USER_PREFIX}${userId}_` : this.USER_PREFIX;
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  /**
   * Clear all application cache
   */
  clearAll(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.USER_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  /**
   * Clear expired entries
   */
  clearOldEntries(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const now = Date.now();
      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(this.USER_PREFIX)) continue;

        try {
          const cached = localStorage.getItem(key);
          if (!cached) continue;

          const entry: CacheEntry<any> = JSON.parse(cached);
          if (now - entry.timestamp > this.DEFAULT_TTL) {
            keysToRemove.push(key);
          }
        } catch {
          // Invalid entry, remove it
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing old cache entries:', error);
    }
  }

  /**
   * Get cache key with user prefix
   */
  private getCacheKey(key: string, userId?: string): string {
    if (userId) {
      return `${this.USER_PREFIX}${userId}_${key}`;
    }
    return `${this.USER_PREFIX}${key}`;
  }

  /**
   * Check if cache exists and is valid
   */
  has(key: string, userId?: string): boolean {
    return this.get(key, userId) !== null;
  }
}

// Singleton instance
export const cacheService = new CacheService();

// Cache keys
export const CACHE_KEYS = {
  MEAL_PLANS: 'meal_plans',
  HEALTH_SETTINGS: 'health_settings',
  USER_PROFILE: 'user_profile',
  HEALTH_HISTORY: 'health_history',
} as const;

