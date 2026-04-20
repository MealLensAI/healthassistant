/**
 * Centralized Image Caching Service
 * Caches images from get-images-qa23.onrender.com to prevent unnecessary re-fetching
 */

const IMAGE_CACHE_KEY = 'meallensai_image_cache';
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for real hits
const IMAGE_FALLBACK_TTL = 15 * 60 * 1000; // 15 min for fallbacks so we retry the API soon
const IMAGE_API_URL = 'https://get-images-qa23.onrender.com/image';

interface CachedImage {
  url: string;
  timestamp: number;
  isFallback?: boolean;
}

interface ImageCache {
  [foodName: string]: CachedImage;
}

class ImageCacheService {
  private cache: ImageCache = {};
  private pendingRequests: Map<string, Promise<string>> = new Map();

  constructor() {
    this.loadCache();
  }

  private isExpired(entry: CachedImage, now = Date.now()): boolean {
    const ttl = entry.isFallback ? IMAGE_FALLBACK_TTL : IMAGE_CACHE_TTL;
    return now - entry.timestamp >= ttl;
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
        if (!this.isExpired(value, now)) {
          validCache[key] = value;
        }
      }

      this.cache = validCache;

      if (Object.keys(validCache).length !== Object.keys(parsed).length) {
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(validCache));
      }
    } catch (error) {
      console.error('Error loading image cache:', error);
      this.cache = {};
    }
  }

  private saveCache(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(this.cache));
      }
    } catch (error) {
      console.error('Error saving image cache:', error);
    }
  }

  /**
   * Get cached image URL or fetch from API
   * @param foodName - The food name to get image for
   * @param fallbackImage - Optional fallback image URL
   * @returns Promise resolving to image URL
   */
  async getImage(foodName: string, fallbackImage?: string): Promise<string> {
    if (!foodName || typeof foodName !== 'string') {
      return fallbackImage || this.getDefaultFallback();
    }

    // Normalize food name (lowercase, trim)
    const normalizedName = foodName.toLowerCase().trim();

    // Check cache first (respecting per-entry TTL)
    const cached = this.cache[normalizedName];
    if (cached && !this.isExpired(cached)) {
      return cached.url;
    }
    // Expired — drop it so the request below hits the API again
    if (cached) {
      delete this.cache[normalizedName];
    }

    // Check if there's already a pending request for this food
    if (this.pendingRequests.has(normalizedName)) {
      return this.pendingRequests.get(normalizedName)!;
    }

    // Create new fetch request
    const fetchPromise = this.fetchImage(normalizedName, fallbackImage);
    this.pendingRequests.set(normalizedName, fetchPromise);

    try {
      const url = await fetchPromise;
      return url;
    } finally {
      this.pendingRequests.delete(normalizedName);
    }
  }

  private async fetchImage(foodName: string, fallbackImage?: string): Promise<string> {
    try {
      const response = await fetch(IMAGE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: foodName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.image_url && !data.error) {
        this.cache[foodName] = {
          url: data.image_url,
          timestamp: Date.now(),
          isFallback: false,
        };
        this.saveCache();
        return data.image_url;
      } else {
        const fallback = fallbackImage || this.getDefaultFallback();
        // Cache fallback with a SHORT TTL so we retry the API soon
        this.cache[foodName] = {
          url: fallback,
          timestamp: Date.now(),
          isFallback: true,
        };
        this.saveCache();
        return fallback;
      }
    } catch (error) {
      console.error(`Error fetching image for "${foodName}":`, error);
      const fallback = fallbackImage || this.getDefaultFallback();
      this.cache[foodName] = {
        url: fallback,
        timestamp: Date.now(),
        isFallback: true,
      };
      this.saveCache();
      return fallback;
    }
  }

  /**
   * Drop a single entry from the cache (both memory and localStorage).
   * Use this when an <img> tag fails to load a URL we previously handed out.
   */
  invalidate(foodName: string): void {
    if (!foodName || typeof foodName !== 'string') return;
    const key = foodName.toLowerCase().trim();
    if (this.cache[key]) {
      delete this.cache[key];
      this.saveCache();
    }
    this.pendingRequests.delete(key);
  }

  /**
   * Force a refetch for a food name, bypassing any cached entry.
   * Returns the new image URL (or a fallback if the API still fails).
   */
  async refreshImage(foodName: string, fallbackImage?: string): Promise<string> {
    if (!foodName || typeof foodName !== 'string') {
      return fallbackImage || this.getDefaultFallback();
    }
    this.invalidate(foodName);
    return this.getImage(foodName, fallbackImage);
  }

  private getDefaultFallback(): string {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop';
  }

  /**
   * Clear the image cache
   */
  clearCache(): void {
    this.cache = {};
    this.pendingRequests.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(IMAGE_CACHE_KEY);
      }
    } catch (error) {
      console.error('Error clearing image cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: Object.keys(this.cache).length,
      keys: Object.keys(this.cache),
    };
  }
}

// Singleton instance
export const imageCache = new ImageCacheService();
