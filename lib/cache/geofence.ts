import {
  getGeofenceConfig,
  type GeofenceConfig,
} from "@/services/systemConfig.service";

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: GeofenceConfig;
  timestamp: number;
}

let cache: CacheEntry | null = null;

/**
 * Get geofence configuration with caching
 * Reduces DB queries on frequent attendance operations
 * @returns Geofence configuration
 */
export async function getCachedGeofenceConfig(): Promise<GeofenceConfig> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  // Fetch fresh data from database
  const config = await getGeofenceConfig();

  // Update cache
  cache = {
    data: config,
    timestamp: now,
  };

  return config;
}

/**
 * Invalidate the geofence cache
 * Call this after admin updates the configuration
 */
export function revalidateGeofenceCache(): void {
  cache = null;
}
