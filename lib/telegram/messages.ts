import { formatCurrency } from "@/lib/utils";
import { formatPaymentMonth } from "@/lib/calculations";
import { escapeHtml, type InlineKeyboardButton } from "./client";
import { monthNameId, type MonthlyReportTotals } from "@/lib/reports/monthly-report";
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

export const CALLBACK_REPORT = "rpt";

const SHORT_MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/**
 * Month picker for /laporan — the 12 most recent months, newest first.
 * callback_data "rpt:2026-07" is 11 bytes, far inside Telegram's 64-byte cap.
 */
export function buildReportMonthKeyboard(now: Date): InlineKeyboardButton[][] {
  const buttons: InlineKeyboardButton[] = [];

  for (let offset = 0; offset < 12; offset += 1) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth() + 1;

    buttons.push({
      text: `${SHORT_MONTH_NAMES[month - 1]} ${year}`,
      callback_data: `${CALLBACK_REPORT}:${year}-${String(month).padStart(2, "0")}`,
    });
  }

  const rows: InlineKeyboardButton[][] = [];
  for (let i = 0; i < buttons.length; i += 3) {
    rows.push(buttons.slice(i, i + 3));
  }
  return rows;
}

export function buildReportCaption(
  year: number,
  month: number,
  totals: MonthlyReportTotals,
  at: Date
): string {
  const lines = [
    `📊 <b>Laporan Keuangan ${monthNameId(month)} ${year}</b>`,
    "",
    `💰 Pemasukan: <b>${formatCurrency(totals.totalIncome)}</b> (${totals.incomeCount} transaksi)`,
    `💸 Pengeluaran: <b>${formatCurrency(totals.totalExpense)}</b> (${totals.expenseCount} transaksi)`,
    `🧾 Saldo: <b>${formatCurrency(totals.balance)}</b>`,
  ];

  if (totals.incomeCount === 0 && totals.expenseCount === 0) {
    lines.push("", "<i>Belum ada transaksi pada periode ini.</i>");
  }

  lines.push("", `<i>Dibuat ${formatWita(at)} WITA</i>`);
  return lines.join("\n");
}
