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

// Default geofence configuration values
const DEFAULT_GEOFENCE_CONFIG = {
  radiusMeters: 100,
  centerLat: -5.091819113786232, // Actual residence coordinates
  centerLon: 119.52879655433493,
};

export interface GeofenceConfig {
  radiusMeters: number;
  centerLat: number;
  centerLon: number;
}

/**
 * Get the geofence configuration from the database
 * Falls back to default if no config exists
 */
export async function getGeofenceConfig(): Promise<GeofenceConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "geofence" },
    });

    if (!config) {
      return DEFAULT_GEOFENCE_CONFIG;
    }

    const value = config.value as unknown as GeofenceConfig;
    return {
      radiusMeters: value.radiusMeters ?? DEFAULT_GEOFENCE_CONFIG.radiusMeters,
      centerLat: value.centerLat ?? DEFAULT_GEOFENCE_CONFIG.centerLat,
      centerLon: value.centerLon ?? DEFAULT_GEOFENCE_CONFIG.centerLon,
    };
  } catch (error) {
    console.error("Error fetching geofence config:", error);
    return DEFAULT_GEOFENCE_CONFIG;
  }
}

// Default bank details configuration values
const DEFAULT_BANK_DETAILS = {
  bankName: "BCA",
  accountNumber: "1234567890",
  accountName: "PT Perumahan Melati",
};

export interface BankDetailsConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

/**
 * Get the bank details configuration from the database
 * Falls back to default if no config exists
 */
export async function getBankDetailsConfig(): Promise<BankDetailsConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "bank_details" },
    });

    if (!config) {
      return DEFAULT_BANK_DETAILS;
    }

    const value = config.value as unknown as BankDetailsConfig;
    return {
      bankName: value.bankName ?? DEFAULT_BANK_DETAILS.bankName,
      accountNumber: value.accountNumber ?? DEFAULT_BANK_DETAILS.accountNumber,
      accountName: value.accountName ?? DEFAULT_BANK_DETAILS.accountName,
    };
  } catch (error) {
    console.error("Error fetching bank details config:", error);
    return DEFAULT_BANK_DETAILS;
  }
}

/**
 * Set bank details configuration
 */
export async function setBankDetailsConfig(
  config: BankDetailsConfig,
  updatedBy: string
): Promise<void> {
  await setConfig("bank_details", config, updatedBy);

  // Invalidate cache
  const { invalidateBankDetailsCache } = await import("@/lib/cache/bank-details");
  invalidateBankDetailsCache();
}

// Default residence info configuration values
const DEFAULT_RESIDENCE_INFO = {
  residenceName: "Perumahan Melati Indah",
  residenceAddress: "",
};

export interface ResidenceInfoConfig {
  residenceName: string;
  residenceAddress: string;
}

/**
 * Get the residence info configuration from the database
 * Falls back to default if no config exists
 */
export async function getResidenceInfoConfig(): Promise<ResidenceInfoConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "residence_info" },
    });

    if (!config) {
      return DEFAULT_RESIDENCE_INFO;
    }

    const value = config.value as unknown as ResidenceInfoConfig;
    return {
      residenceName: value.residenceName ?? DEFAULT_RESIDENCE_INFO.residenceName,
      residenceAddress: value.residenceAddress ?? DEFAULT_RESIDENCE_INFO.residenceAddress,
    };
  } catch (error) {
    console.error("Error fetching residence info config:", error);
    return DEFAULT_RESIDENCE_INFO;
  }
}

/**
 * Set residence info configuration
 */
export async function setResidenceInfoConfig(
  config: ResidenceInfoConfig,
  updatedBy: string
): Promise<void> {
  await setConfig("residence_info", config, updatedBy);

  // Invalidate cache
  const { invalidateResidenceInfoCache } = await import("@/lib/cache/residence-info");
  invalidateResidenceInfoCache();
}

// Default WhatsApp message template
const DEFAULT_WHATSAPP_TEMPLATE = {
  template:
    "Halo, saya warga Sakura Village blok {block} no {number}, saya ingin minta bantuannya",
};

export interface WhatsAppTemplateConfig {
  template: string;
}

/**
 * Get the WhatsApp message template configuration from the database
 * Falls back to default if no config exists
 */
export async function getWhatsAppTemplateConfig(): Promise<WhatsAppTemplateConfig> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "whatsapp_template" },
    });

    if (!config) {
      return DEFAULT_WHATSAPP_TEMPLATE;
    }

    const value = config.value as unknown as WhatsAppTemplateConfig;
    return {
      template: value.template ?? DEFAULT_WHATSAPP_TEMPLATE.template,
    };
  } catch (error) {
    console.error("Error fetching WhatsApp template config:", error);
    return DEFAULT_WHATSAPP_TEMPLATE;
  }
}

/**
 * Set WhatsApp message template configuration
 */
export async function setWhatsAppTemplateConfig(
  config: WhatsAppTemplateConfig,
  updatedBy: string
): Promise<void> {
  await setConfig("whatsapp_template", config, updatedBy);

  // Invalidate cache
  const { invalidateWhatsAppTemplateCache } = await import("@/lib/cache/whatsapp-template");
  invalidateWhatsAppTemplateCache();
}
