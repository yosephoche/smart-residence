import {
  getLeaveConfig,
  type LeaveConfig,
} from "@/services/systemConfig.service";

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: LeaveConfig;
  timestamp: number;
}

let cache: CacheEntry | null = null;

/**
 * Get leave configuration with caching
 * Reduces DB queries on frequent leave request submissions
 */
export async function getCachedLeaveConfig(): Promise<LeaveConfig> {
  const now = Date.now();

  // Return cached data if still valid
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  // Fetch fresh data from database
  const config = await getLeaveConfig();

  // Update cache
  cache = {
    data: config,
    timestamp: now,
  };

  return config;
}

/**
 * Invalidate the leave config cache
 * Call this after admin updates the configuration
 */
export function invalidateLeaveConfigCache(): void {
  cache = null;
}
