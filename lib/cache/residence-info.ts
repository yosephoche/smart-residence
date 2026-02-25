import { getResidenceInfoConfig as getConfig } from "@/services/systemConfig.service";

interface ResidenceInfoConfig {
  residenceName: string;
  residenceAddress: string;
}

// In-memory cache
let cache: {
  data: ResidenceInfoConfig | null;
  timestamp: number | null;
} = {
  data: null,
  timestamp: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get residence info config from cache or database
 */
export async function getCachedResidenceInfoConfig(): Promise<ResidenceInfoConfig> {
  const now = Date.now();

  // Return cached data if valid
  if (cache.data && cache.timestamp && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  // Fetch from database
  const config = await getConfig();

  // Update cache
  cache.data = config;
  cache.timestamp = now;

  return config;
}

/**
 * Invalidate the cache (call after config update)
 */
export function invalidateResidenceInfoCache(): void {
  cache.data = null;
  cache.timestamp = null;
}
