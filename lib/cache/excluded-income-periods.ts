import {
  getExcludedIncomePeriodsConfig,
  type ExcludedIncomePeriod,
} from "@/services/systemConfig.service";

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: ExcludedIncomePeriod[];
  timestamp: number;
}

let cache: CacheEntry | null = null;

/**
 * Get excluded income periods with caching
 * @returns Array of excluded {year, month} periods
 */
export async function getCachedExcludedIncomePeriods(): Promise<ExcludedIncomePeriod[]> {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const config = await getExcludedIncomePeriodsConfig();

  cache = {
    data: config.periods,
    timestamp: now,
  };

  return config.periods;
}

/**
 * Invalidate the excluded income periods cache
 * Call this after admin updates the configuration
 */
export function invalidateExcludedIncomePeriodsCache(): void {
  cache = null;
}
