// Application Constants

export const APP_NAME = "SmartResidence";
export const APP_DESCRIPTION = "IPL Management System";

// User Roles
export const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
  STAFF: "STAFF",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

// File Upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// Payment Configuration
export const MIN_PAYMENT_MONTHS = 1;
export const MAX_PAYMENT_MONTHS = 12;
export const UPLOAD_WINDOW_LAST_DAY = 10;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Toast Durations (ms)
export const TOAST_DURATION = {
  success: 3000,
  error: 6000,
  info: 4000,
} as const;

// Payment Status Display
export const PAYMENT_STATUS_CONFIG = {
  APPROVED: { label: "Lunas", color: "text-emerald-600", bg: "bg-emerald-50" },
  PENDING:  { label: "Menunggu", color: "text-amber-600",   bg: "bg-amber-50"   },
  REJECTED: { label: "Ditolak", color: "text-red-600",     bg: "bg-red-50"     },
} as const;

// Currency
export const CURRENCY_SYMBOL = "Rp";
export const CURRENCY_LOCALE = "id-ID";

// Number Formatting
export const CURRENCY_COMPACT_THRESHOLD = 10_000_000; // 10 million
export const CURRENCY_COMPACT_PRECISION = 2;          // 2 decimal places
export const CURRENCY_SHOW_TOOLTIPS = true;           // Show full value on hover
