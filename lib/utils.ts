import {
  CURRENCY_SYMBOL,
  CURRENCY_LOCALE,
  CURRENCY_COMPACT_THRESHOLD,
  CURRENCY_COMPACT_PRECISION,
} from "./constants";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency in Indonesian Rupiah
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace("IDR", CURRENCY_SYMBOL);
}

// Format date to Indonesian locale
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dateObj);
}

// Format date with time
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj);
}

// Validate file type
export function isValidImageType(file: File): boolean {
  const validTypes = ["image/jpeg", "image/png", "image/jpg"];
  return validTypes.includes(file.type);
}

// Validate file size
export function isValidFileSize(file: File, maxSize: number = 2 * 1024 * 1024): boolean {
  return file.size <= maxSize;
}

// Generate unique filename
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.substring(originalName.lastIndexOf("."));
  return `${timestamp}-${randomString}${extension}`;
}

// Calculate payment total
export function calculatePaymentTotal(pricePerMonth: number, months: number): number {
  return pricePerMonth * months;
}

// Truncate text
export function truncate(text: string, length: number = 50): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + "...";
}

// Sleep utility for debugging/testing
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Format currency with smart abbreviation (compact display)
export interface FormatCurrencyCompactResult {
  display: string;
  full: string;
  isAbbreviated: boolean;
  suffix?: string;
}

export function formatCurrencyCompact(
  amount: number,
  options: {
    threshold?: number;
    precision?: number;
    forceCompact?: boolean;
  } = {}
): FormatCurrencyCompactResult {
  const {
    threshold = CURRENCY_COMPACT_THRESHOLD,
    precision = CURRENCY_COMPACT_PRECISION,
    forceCompact = false,
  } = options;

  // Generate full format for tooltip
  const full = formatCurrency(amount);

  // Check if we should abbreviate
  const shouldAbbreviate = forceCompact || Math.abs(amount) >= threshold;

  if (!shouldAbbreviate) {
    return {
      display: full,
      full,
      isAbbreviated: false,
    };
  }

  // Determine divisor and suffix based on magnitude
  let divisor = 1;
  let suffix = "";

  const absAmount = Math.abs(amount);

  if (absAmount >= 1_000_000_000_000) {
    // Triliun (Trillion)
    divisor = 1_000_000_000_000;
    suffix = "Triliun";
  } else if (absAmount >= 1_000_000_000) {
    // Miliar (Billion)
    divisor = 1_000_000_000;
    suffix = "Miliar";
  } else if (absAmount >= 1_000_000) {
    // Juta (Million)
    divisor = 1_000_000;
    suffix = "Juta";
  }

  // Calculate abbreviated value
  const abbreviated = amount / divisor;

  // Format with Indonesian locale
  const formattedNumber = new Intl.NumberFormat(CURRENCY_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: precision,
  }).format(abbreviated);

  const display = `${CURRENCY_SYMBOL} ${formattedNumber} ${suffix}`;

  return {
    display,
    full,
    isAbbreviated: true,
    suffix,
  };
}

// Get dynamic text size class based on text length
export function getDynamicTextSize(text: string, maxLength: number = 10): string {
  const length = text.length;

  if (length <= maxLength) {
    return "text-3xl"; // 48px
  } else if (length <= maxLength + 3) {
    return "text-2xl"; // 36px
  } else if (length <= maxLength + 6) {
    return "text-xl"; // 24px
  } else {
    return "text-lg"; // 20px
  }
}
