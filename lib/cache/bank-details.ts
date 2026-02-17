import { getBankDetailsConfig as getConfig } from "@/services/systemConfig.service";

interface BankDetailsConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

// In-memory cache
let cache: {
  data: BankDetailsConfig | null;
  timestamp: number | null;
} = {
  data: null,
  timestamp: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get bank details config from cache or database
 */
export async function getCachedBankDetailsConfig(): Promise<BankDetailsConfig> {
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
export function invalidateBankDetailsCache(): void {
  cache.data = null;
  cache.timestamp = null;
}
