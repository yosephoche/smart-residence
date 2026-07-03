import {
  getBillingStartConfig,
  type BillingStartConfig,
} from "@/services/systemConfig.service";

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: BillingStartConfig;
  timestamp: number;
}

let cache: CacheEntry | null = null;

/**
 * Get billing start configuration with caching
 * @returns {enabled, year, month} — arrears anchor month
 */
export async function getCachedBillingStartConfig(): Promise<BillingStartConfig> {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const config = await getBillingStartConfig();

  cache = {
    data: config,
    timestamp: now,
  };

  return config;
}

/**
 * Invalidate the billing start cache
 * Call this after admin updates the configuration
 */
export function invalidateBillingStartCache(): void {
  cache = null;
}
