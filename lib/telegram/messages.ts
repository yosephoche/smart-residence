import { formatCurrency } from "@/lib/utils";
import { formatPaymentMonth } from "@/lib/calculations";
import { escapeHtml, type InlineKeyboardButton } from "./client";
import { monthNameId, type MonthlyReportTotals } from "@/lib/reports/monthly-report";
import type { PaymentNotification } from "@/lib/notifications/types";
import type { CopyPlanSummary } from "@/services/staffSchedule.service";

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

export const CALLBACK_COPY_SCHEDULE_APPROVE = "csa";
export const CALLBACK_COPY_SCHEDULE_CANCEL = "csc";

/** callback_data "csa:<cuid>" is ~29 bytes — well inside Telegram's 64-byte cap. */
export function buildCopyScheduleKeyboard(operationId: string): InlineKeyboardButton[][] {
  return [
    [
      { text: "✅ Approve & Jalankan", callback_data: `${CALLBACK_COPY_SCHEDULE_APPROVE}:${operationId}` },
      { text: "❌ Batalkan", callback_data: `${CALLBACK_COPY_SCHEDULE_CANCEL}:${operationId}` },
    ],
  ];
}

export function buildCopySchedulePreviewMessage(
  sourceYear: number,
  sourceMonth: number,
  targetYear: number,
  targetMonth: number,
  summary: CopyPlanSummary,
  expiresAt: Date
): string {
  const lines = [
    "🗓️ <b>Preview Copy Jadwal</b>",
    "",
    `Dari: <b>${monthNameId(sourceMonth)} ${sourceYear}</b> → Ke: <b>${monthNameId(targetMonth)} ${targetYear}</b>`,
    "",
    `🆕 Akan dibuat: <b>${summary.created}</b>`,
    `♻️ Akan ditimpa (overwrite): <b>${summary.overwritten}</b>`,
    `🚫 Slot dikosongkan (cuti): <b>${summary.emptySlotLeave}</b>`,
  ];

  if (summary.skippedTemplateUnavailable > 0) {
    lines.push(
      `⚠️ Dilewati (shift template tidak aktif/terhapus): <b>${summary.skippedTemplateUnavailable}</b>`
    );
  }

  if (summary.understaffedWarnings.length > 0) {
    lines.push(
      "",
      `⚠️ <b>${summary.understaffedWarnings.length} shift kekurangan staf</b> akibat slot yang dikosongkan — cek detail di dashboard sebelum approve.`
    );
  }

  lines.push(
    "",
    `<i>Preview berlaku sampai ${formatWita(expiresAt)} WITA. Data lama di bulan tujuan akan tertimpa — tinjau baik-baik sebelum approve.</i>`
  );

  return lines.join("\n");
}

export const CALLBACK_MANUAL_ATTENDANCE_APPROVE = "maa";
export const CALLBACK_MANUAL_ATTENDANCE_REJECT = "mar";

export interface ManualAttendanceRequestNotification {
  id: string;
  staffName: string;
  jobType: string;
  date: Date;
  shiftName: string;
  clockInAt: Date;
  clockOutAt: Date;
  reason: string;
  createdAt: Date;
}

/** callback_data "maa:<cuid>" is ~29 bytes — well inside Telegram's 64-byte cap. */
export function buildManualAttendanceKeyboard(requestId: string): InlineKeyboardButton[][] {
  return [
    [
      { text: "✅ Setujui", callback_data: `${CALLBACK_MANUAL_ATTENDANCE_APPROVE}:${requestId}` },
      { text: "❌ Tolak", callback_data: `${CALLBACK_MANUAL_ATTENDANCE_REJECT}:${requestId}` },
    ],
  ];
}

export function buildManualAttendanceRequestMessage(
  notification: ManualAttendanceRequestNotification
): string {
  return [
    "📝 <b>Pengajuan Absen Manual</b>",
    "",
    `👤 Staff: <b>${escapeHtml(notification.staffName)}</b> (${escapeHtml(notification.jobType)})`,
    `📅 Tanggal: <b>${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" }).format(notification.date)}</b>`,
    `🕐 Shift: ${escapeHtml(notification.shiftName)} (${formatWitaTime(notification.clockInAt)}–${formatWitaTime(notification.clockOutAt)} WITA)`,
    `📝 Alasan: ${escapeHtml(notification.reason)}`,
    "",
    `<i>Diajukan ${formatWita(notification.createdAt)} WITA</i>`,
  ].join("\n");
}

export function buildManualAttendanceResultMessage(
  notification: ManualAttendanceRequestNotification,
  decision: "APPROVED" | "REJECTED",
  adminName: string,
  at: Date,
  rejectionNote?: string
): string {
  const lines = [
    decision === "APPROVED"
      ? "✅ <b>Absen Manual Disetujui</b>"
      : "❌ <b>Absen Manual Ditolak</b>",
    "",
    `👤 Staff: <b>${escapeHtml(notification.staffName)}</b>`,
    `📅 Tanggal: <b>${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Makassar" }).format(notification.date)}</b>`,
  ];

  if (decision === "REJECTED" && rejectionNote) {
    lines.push(`📝 Catatan: ${escapeHtml(rejectionNote)}`);
  }

  lines.push(
    "",
    `${decision === "APPROVED" ? "Disetujui" : "Ditolak"} oleh <b>${escapeHtml(adminName)}</b> · ${formatWitaTime(at)} WITA`
  );

  return lines.join("\n");
}

export function buildCopyScheduleResultMessage(
  createdCount: number,
  updatedCount: number,
  adminName: string,
  at: Date
): string {
  return [
    "✅ <b>Copy Jadwal Selesai</b>",
    "",
    `🆕 Dibuat: <b>${createdCount}</b>`,
    `♻️ Ditimpa: <b>${updatedCount}</b>`,
    "",
    `Dijalankan oleh <b>${escapeHtml(adminName)}</b> · ${formatWitaTime(at)} WITA`,
  ].join("\n");
}
