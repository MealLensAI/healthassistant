/**
 * Centralized Image Caching Service
 * Caches images from get-images-qa23.onrender.com to prevent unnecessary re-fetching
 */

const IMAGE_CACHE_KEY = 'meallensai_image_cache';
const IMAGE_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const IMAGE_API_URL = 'https://get-images-qa23.onrender.com/image';

interface CachedImage {
  url: string;
  timestamp: number;
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

  private loadCache(): void {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      
      const cached = localStorage.getItem(IMAGE_CACHE_KEY);
      if (!cached) return;

      const parsed: ImageCache = JSON.parse(cached);
      const now = Date.now();

      // Clean expired entries
      const validCache: ImageCache = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (now - value.timestamp < IMAGE_CACHE_TTL) {
          validCache[key] = value;
        }
      }

      this.cache = validCache;
      
      // Update localStorage with cleaned cache
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

    // Check cache first
    const cached = this.cache[normalizedName];
    if (cached) {
      return cached.url;
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
        // Cache the successful result
        this.cache[foodName] = {
          url: data.image_url,
          timestamp: Date.now(),
        };
        this.saveCache();
        return data.image_url;
      } else {
        // Use fallback
        const fallback = fallbackImage || this.getDefaultFallback();
        // Cache fallback to avoid repeated failed requests
        this.cache[foodName] = {
          url: fallback,
          timestamp: Date.now(),
        };
        this.saveCache();
        return fallback;
      }
    } catch (error) {
      console.error(`Error fetching image for "${foodName}":`, error);
      const fallback = fallbackImage || this.getDefaultFallback();
      // Cache fallback to avoid repeated failed requests
      this.cache[foodName] = {
        url: fallback,
        timestamp: Date.now(),
      };
      this.saveCache();
      return fallback;
    }
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
