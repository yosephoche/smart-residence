import { prisma } from "@/lib/prisma";

// Default configuration values
const DEFAULT_UPLOAD_WINDOW = {
  enabled: false, // Inactive by default for backward compatibility
  startDay: 1,
  endDay: 10,
};

export interface UploadWindowConfig {
  enabled: boolean;
  startDay: number;
  endDay: number;
}

export interface WindowCheckResult {
  allowed: boolean;
  message?: string;
}

/**
 * Get the upload window configuration from the database
 * Falls back to default if no config exists
 */
export async function getUploadWindowConfig(): Promise<UploadWindowConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "upload_window" },
    });

    if (!config) {
      return DEFAULT_UPLOAD_WINDOW;
    }

    const value = config.value as unknown as UploadWindowConfig;
    return {
      enabled: value.enabled ?? DEFAULT_UPLOAD_WINDOW.enabled,
      startDay: value.startDay ?? DEFAULT_UPLOAD_WINDOW.startDay,
      endDay: value.endDay ?? DEFAULT_UPLOAD_WINDOW.endDay,
    };
  } catch (error) {
    console.error("Error fetching upload window config:", error);
    return DEFAULT_UPLOAD_WINDOW;
  }
}

/**
 * Set or update a system configuration
 * @param key - Configuration key
 * @param value - Configuration value (JSON)
 * @param updatedBy - User ID who is updating the config
 */
export async function setConfig(
  key: string,
  value: unknown,
  updatedBy: string
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    update: {
      value: value as any,
      updatedBy,
    },
    create: {
      key,
      value: value as any,
      updatedBy,
    },
  });
}

/**
 * Check if a given date is within the upload window
 * @param config - Upload window configuration
 * @param date - Date to check (defaults to current date)
 * @returns Object with allowed status and optional error message
 */
export function isWithinUploadWindow(
  config: UploadWindowConfig,
  date: Date = new Date()
): WindowCheckResult {
  // If upload window is disabled, always allow
  if (!config.enabled) {
    return { allowed: true };
  }

  const currentDay = date.getDate();

  // Check if current day is within the configured range
  if (currentDay < config.startDay || currentDay > config.endDay) {
    return {
      allowed: false,
      message: `Pengajuan pembayaran hanya diizinkan pada tanggal ${config.startDay} hingga ${config.endDay} setiap bulan.`,
    };
  }

  return { allowed: true };
}

// Default password configuration
const DEFAULT_PASSWORD = "sakura2026";

export interface DefaultPasswordConfig {
  defaultPassword: string;
}

/**
 * Get the default password configuration from the database
 * Falls back to default if no config exists
 */
export async function getDefaultPasswordConfig(): Promise<DefaultPasswordConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "default_password" },
    });

    if (!config) {
      return { defaultPassword: DEFAULT_PASSWORD };
    }

    const value = config.value as unknown as DefaultPasswordConfig;
    return {
      defaultPassword: value.defaultPassword ?? DEFAULT_PASSWORD,
    };
  } catch (error) {
    console.error("Error fetching default password config:", error);
    return { defaultPassword: DEFAULT_PASSWORD };
  }
}
