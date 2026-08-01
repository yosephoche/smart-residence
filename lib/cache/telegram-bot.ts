import {
  getTelegramBotConfig,
  type TelegramBotConfig,
} from "@/services/systemConfig.service";

// In-memory cache with 5-minute TTL
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: TelegramBotConfig;
  timestamp: number;
}

let cache: CacheEntry | null = null;

/**
 * Get Telegram bot configuration with caching
 * @returns {enabled, groupChatId, notifyOnUpload}
 */
export async function getCachedTelegramBotConfig(): Promise<TelegramBotConfig> {
  const now = Date.now();

  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const config = await getTelegramBotConfig();

  cache = {
    data: config,
    timestamp: now,
  };

  return config;
}

/**
 * Invalidate the Telegram bot cache
 * Call this after admin updates the configuration
 */
export function invalidateTelegramBotCache(): void {
  cache = null;
}
