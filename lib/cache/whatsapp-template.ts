import { getWhatsAppTemplateConfig } from "@/services/systemConfig.service";

interface WhatsAppTemplateConfig {
  template: string;
}

// In-memory cache
let cache: {
  data: WhatsAppTemplateConfig | null;
  timestamp: number | null;
} = {
  data: null,
  timestamp: null,
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get WhatsApp template config from cache or database
 */
export async function getCachedWhatsAppTemplateConfig(): Promise<WhatsAppTemplateConfig> {
  const now = Date.now();

  // Return cached data if valid
  if (cache.data && cache.timestamp && now - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  // Fetch from database
  const config = await getWhatsAppTemplateConfig();

  // Update cache
  cache.data = config;
  cache.timestamp = now;

  return config;
}

/**
 * Invalidate the cache (call after config update)
 */
export function invalidateWhatsAppTemplateCache(): void {
  cache.data = null;
  cache.timestamp = null;
}
