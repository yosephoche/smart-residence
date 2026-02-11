import {
  getDefaultPasswordConfig,
  type DefaultPasswordConfig,
} from "@/services/systemConfig.service";

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: DefaultPasswordConfig;
  timestamp: number;
}

let cache: CacheEntry | null = null;

/**
 * Get default password configuration with caching
 * Reduces DB queries on frequent user creation operations
 * @returns Default password configuration
 */
export async function getCachedDefaultPasswordConfig(): Promise<DefaultPasswordConfig> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  // Fetch fresh data from database
  const config = await getDefaultPasswordConfig();

  // Update cache
  cache = {
    data: config,
    timestamp: now,
  };

  return config;
}

/**
 * Invalidate the default password cache
 * Call this after admin updates the configuration
 */
export function revalidateDefaultPasswordCache(): void {
  cache = null;
}
