import { formatCurrency } from "@/lib/utils";
import { formatPaymentMonth } from "@/lib/calculations";
import { escapeHtml, type InlineKeyboardButton } from "./client";
import type { PaymentNotification } from "@/lib/notifications/types";

/**
 * Server timezone is UTC on Vercel while the residence runs on WITA, so every
 * timestamp shown to admins is pinned to Asia/Makassar explicitly.
 */
const WITA_TIME_ZONE = "Asia/Makassar";

export function formatWita(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: WITA_TIME_ZONE,
  }).format(date);
}

export function formatWitaTime(date: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: WITA_TIME_ZONE,
  }).format(date);
}

function monthsLabel(months: PaymentNotification["months"]): string {
  if (months.length === 0) return "-";
  if (months.length <= 3) {
    return months.map(formatPaymentMonth).join(", ");
  }
  return `${formatPaymentMonth(months[0])} — ${formatPaymentMonth(
    months[months.length - 1]
  )} (${months.length} bulan)`;
}

/** Caption for the "new proof uploaded" notification. */
export function buildUploadMessage(payment: PaymentNotification): string {
  return [
    "🔔 <b>Bukti Pembayaran Baru</b>",
    "",
    `👤 Warga: <b>${escapeHtml(payment.userName)}</b>`,
    `🏠 Rumah: <b>${escapeHtml(payment.block)}-${escapeHtml(payment.houseNumber)}</b>`,
    `📅 Periode: ${escapeHtml(monthsLabel(payment.months))}`,
    `💰 Total: <b>${formatCurrency(payment.totalAmount)}</b> (${payment.amountMonths} bulan)`,
    `🕒 Diunggah: ${formatWita(payment.createdAt)}`,
  ].join("\n");
}

export function buildApprovedMessage(
  payment: PaymentNotification,
  adminName: string,
  at: Date
): string {
  return [
    "✅ <b>Pembayaran Disetujui</b>",
    "",
    `👤 Warga: <b>${escapeHtml(payment.userName)}</b>`,
    `🏠 Rumah: <b>${escapeHtml(payment.block)}-${escapeHtml(payment.houseNumber)}</b>`,
    `📅 Periode: ${escapeHtml(monthsLabel(payment.months))}`,
    `💰 Total: <b>${formatCurrency(payment.totalAmount)}</b>`,
    "",
    `Disetujui oleh <b>${escapeHtml(adminName)}</b> · ${formatWitaTime(at)} WITA`,
  ].join("\n");
}

export function buildRejectedMessage(
  payment: PaymentNotification,
  adminName: string,
  reason: string,
  at: Date
): string {
  return [
    "❌ <b>Pembayaran Ditolak</b>",
    "",
    `👤 Warga: <b>${escapeHtml(payment.userName)}</b>`,
    `🏠 Rumah: <b>${escapeHtml(payment.block)}-${escapeHtml(payment.houseNumber)}</b>`,
    `💰 Total: <b>${formatCurrency(payment.totalAmount)}</b>`,
    `📝 Alasan: ${escapeHtml(reason)}`,
    "",
    `Ditolak oleh <b>${escapeHtml(adminName)}</b> · ${formatWitaTime(at)} WITA`,
  ].join("\n");
}

export const CALLBACK_APPROVE = "apv";
export const CALLBACK_REJECT = "rej";

/**
 * Telegram caps callback_data at 64 bytes; a cuid is 25 chars so "apv:<cuid>"
 * lands at 29 and stays well inside the limit.
 */
export function buildActionKeyboard(paymentId: string): InlineKeyboardButton[][] {
  return [
    [
      { text: "✅ Setujui", callback_data: `${CALLBACK_APPROVE}:${paymentId}` },
      { text: "❌ Tolak", callback_data: `${CALLBACK_REJECT}:${paymentId}` },
    ],
  ];
}

/**
 * Marker embedded in the force-reply prompt. The rejection flow stays
 * stateless by reading the payment id back out of the message being replied
 * to — there is nowhere to keep session state on serverless.
 */
export function buildRejectPrompt(paymentId: string, payment: PaymentNotification): string {
  return [
    `📝 Balas pesan ini dengan alasan penolakan untuk pembayaran ${escapeHtml(
      payment.block
    )}-${escapeHtml(payment.houseNumber)} (${escapeHtml(payment.userName)}).`,
    "",
    `[#${paymentId}]`,
  ].join("\n");
}

export function extractPaymentIdFromPrompt(text: string): string | null {
  const match = text.match(/\[#([a-z0-9]+)\]/i);
  return match ? match[1] : null;
}
