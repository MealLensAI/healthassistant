/**
 * Centralized Image Caching Service
 *
 * Images are ALWAYS fetched from the upstream food-image lookup service
 * (configured via VITE_IMAGES_API_URL in .env) using the food name as
 * the query — passed through almost untouched, exactly the way the API
 * expects it. There are no fallback image URLs and no DB-stored URLs
 * are honored. If the API can't return a usable image we return `null`
 * and the UI renders a styled placeholder instead.
 *
 * NOTE: We bump CACHE_VERSION whenever the contract changes so every
 * browser drops its old localStorage cache on next load.
 */

import { APP_CONFIG } from '@/lib/config';

const CACHE_VERSION = 'v6';
const IMAGE_CACHE_KEY = `meallensai_image_cache_${CACHE_VERSION}`;
const LEGACY_CACHE_KEYS = [
  'meallensai_image_cache',
  'meallensai_image_cache_v2',
  'meallensai_image_cache_v3',
  'meallensai_image_cache_v4',
  'meallensai_image_cache_v5',
];
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
// Same-origin path so the browser doesn't emit a CORS preflight (the
// upstream image service does NOT respond with Access-Control-Allow-*
// headers, so calling it directly from the browser fails). Vite (dev)
// and Vercel (prod) both rewrite this to the configured upstream
// (VITE_IMAGES_API_URL) server-side.
const IMAGE_API_URL = APP_CONFIG.api.images_proxy_path;
// Render free tier cold-starts can take ~20s, so we give it a generous window.
const IMAGE_API_TIMEOUT_MS = 45000;
// Render free tier returns 502/503 when hit concurrently, especially right
// after a cold start. Cap how many image requests we have in-flight at once.
const MAX_CONCURRENT_REQUESTS = 2;
// On 5xx / network errors we retry a few times with backoff before giving up.
const MAX_API_ATTEMPTS = 3;
const BASE_RETRY_DELAY_MS = 2000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface CachedImage {
  url: string;
  timestamp: number;
}

interface ImageCache {
  [foodName: string]: CachedImage;
}

/**
 * Lightly clean a raw food name so we can use it as both a cache key and
 * the API query. We deliberately keep the dish description intact —
 * "Cucumber Slices with Hummus" must stay as "Cucumber Slices with
 * Hummus" because that's what the upstream image API expects.
 *
 * The only things we strip:
 *   - "(buy: ...)" suffixes added by the AI
 *   - any other parenthesised aside
 *   - duplicate / leading / trailing whitespace
 */
const cleanFoodName = (raw: string): string => {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(/\(\s*buy\s*:[^)]*\)/gi, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Heuristic: does this URL look like a real image we can render?
 * We deliberately do NOT require a specific host — the upstream image API
 * legitimately returns images from many CDNs.
 */
const isLikelyImageUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.length > 2048) return false;
  return true;
};

class ImageCacheService {
  private cache: ImageCache = {};
  private pendingRequests: Map<string, Promise<string | null>> = new Map();
  private activeRequests = 0;
  private waiters: Array<() => void> = [];

  constructor() {
    this.purgeLegacyCaches();
    this.loadCache();
  }

  private async acquireSlot(): Promise<void> {
    if (this.activeRequests < MAX_CONCURRENT_REQUESTS) {
      this.activeRequests++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.activeRequests++;
  }

  private releaseSlot(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    const next = this.waiters.shift();
    if (next) next();
  }

  private purgeLegacyCaches(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      for (const key of LEGACY_CACHE_KEYS) {
        if (key === IMAGE_CACHE_KEY) continue;
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('[imageCache] Error purging legacy cache:', error);
    }
  }

  private isExpired(entry: CachedImage, now = Date.now()): boolean {
    return now - entry.timestamp >= IMAGE_CACHE_TTL;
  }

  private loadCache(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;

      const cached = localStorage.getItem(IMAGE_CACHE_KEY);
      if (!cached) return;

      const parsed: ImageCache = JSON.parse(cached);
      const now = Date.now();

      const validCache: ImageCache = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (!value || !isLikelyImageUrl(value.url)) continue;
        if (!this.isExpired(value, now)) {
          validCache[key] = value;
        }
      }

      this.cache = validCache;

      if (Object.keys(validCache).length !== Object.keys(parsed).length) {
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(validCache));
      }
    } catch (error) {
      console.error('[imageCache] Error loading cache:', error);
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(this.cache));
      }
    } catch (error) {
      console.error('[imageCache] Error saving cache:', error);
    }
  }

  // Cache key is case-insensitive so "Pancakes" and "pancakes" share an
  // entry, but the query we send to the API preserves whatever case the
  // caller used.
  private cacheKey(foodName: string): string {
    return cleanFoodName(foodName).toLowerCase();
  }

  /**
   * Fetch the food image from the upstream image service (cached in
   * localStorage). Returns `null` on failure — the caller must render a
   * placeholder, NOT a fallback image URL.
   */
  async getImage(foodName: string): Promise<string | null> {
    const key = this.cacheKey(foodName);
    if (!key) return null;

    const cached = this.cache[key];
    if (cached && !this.isExpired(cached) && isLikelyImageUrl(cached.url)) {
      return cached.url;
    }
    if (cached) {
      delete this.cache[key];
    }

    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const query = cleanFoodName(foodName);
    const fetchPromise = this.fetchImage(key, query);
    this.pendingRequests.set(key, fetchPromise);

    try {
      return await fetchPromise;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async fetchImage(key: string, query: string): Promise<string | null> {
    await this.acquireSlot();
    try {
      for (let attempt = 0; attempt < MAX_API_ATTEMPTS; attempt++) {
        const isLastAttempt = attempt === MAX_API_ATTEMPTS - 1;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), IMAGE_API_TIMEOUT_MS);

          console.log(`[imageCache] POST ${IMAGE_API_URL} q="${query}" (attempt ${attempt + 1})`);
          const response = await fetch(IMAGE_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ q: query }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (response.status >= 500 && response.status < 600) {
            // Render free tier hibernating / cold-start error. Retry.
            console.warn(`[imageCache] API ${response.status} for "${query}" — retrying`);
            if (!isLastAttempt) {
              await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
              continue;
            }
            return null;
          }

          if (!response.ok) {
            console.warn(`[imageCache] API ${response.status} for "${query}" — giving up`);
            return null;
          }

          const data = await response.json();
          const candidate = data?.image_url;
          console.log(`[imageCache] q="${query}" → ${candidate || 'NO_IMAGE'}`);

          if (isLikelyImageUrl(candidate) && !data?.error) {
            this.cache[key] = {
              url: candidate,
              timestamp: Date.now(),
            };
            this.saveCache();
            return candidate;
          }

          return null;
        } catch (error) {
          console.error(`[imageCache] Error fetching image for "${query}" (attempt ${attempt + 1}):`, error);
          if (!isLastAttempt) {
            await sleep(BASE_RETRY_DELAY_MS * Math.pow(2, attempt));
            continue;
          }
          return null;
        }
      }
      return null;
    } finally {
      this.releaseSlot();
    }
  }

  /**
   * Drop a single entry from the cache (both memory and localStorage).
   * Use this when an <img> tag fails to load a URL we previously handed out.
   */
  invalidate(foodName: string): void {
    const key = this.cacheKey(foodName);
    if (!key) return;
    if (this.cache[key]) {
      delete this.cache[key];
      this.saveCache();
    }
    this.pendingRequests.delete(key);
  }

  /**
   * Force a refetch for a food name, bypassing any cached entry.
   */
  async refreshImage(foodName: string): Promise<string | null> {
    const key = this.cacheKey(foodName);
    if (!key) return null;
    this.invalidate(foodName);
    return this.getImage(foodName);
  }

  clearCache(): void {
    this.cache = {};
    this.pendingRequests.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(IMAGE_CACHE_KEY);
      }
    } catch (error) {
      console.error('[imageCache] Error clearing cache:', error);
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: Object.keys(this.cache).length,
      keys: Object.keys(this.cache),
    };
  }
}

export const imageCache = new ImageCacheService();
