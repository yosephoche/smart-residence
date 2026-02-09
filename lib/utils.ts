import { CURRENCY_SYMBOL, CURRENCY_LOCALE } from "./constants";
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
