import {
  getUploadWindowConfig,
  type UploadWindowConfig,
} from "@/services/systemConfig.service";

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: UploadWindowConfig;
  timestamp: number;
}

let cache: CacheEntry | null = null;

/**
 * Get upload window configuration with caching
 * Reduces DB queries on frequent payment submissions
 * @returns Upload window configuration
 */
export async function getCachedUploadWindowConfig(): Promise<UploadWindowConfig> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  // Fetch fresh data from database
  const config = await getUploadWindowConfig();

  // Update cache
  cache = {
    data: config,
    timestamp: now,
  };

  return config;
}

/**
 * Invalidate the upload window cache
 * Call this after admin updates the configuration
 */
export function revalidateUploadWindowCache(): void {
  cache = null;
}
