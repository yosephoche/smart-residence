import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import {
  approvePayment,
  getPaymentStats,
  getUnpaidHousesThisMonth,
  rejectPayment,
} from "@/services/payment.service";
import { getMonthlyIncomes } from "@/services/income.service";
import { getCachedTelegramBotConfig } from "@/lib/cache/telegram-bot";
import { dispatchPaymentDecided } from "@/lib/notifications";
import { redeemLinkCode, resolveAdminFromTelegram, unlinkTelegram } from "./auth";
import {
  answerCallbackQuery,
  editMessage,
  escapeHtml,
  sendDocument,
  sendMessage,
  sendPhoto,
  type TelegramCallbackQuery,
  type TelegramMessage,
  type TelegramUpdate,
} from "./client";
import {
  CALLBACK_APPROVE,
  CALLBACK_REJECT,
  CALLBACK_REPORT,
  buildActionKeyboard,
  buildApprovedMessage,
  buildRejectPrompt,
  buildRejectedMessage,
  buildReportCaption,
  buildReportMonthKeyboard,
  buildUploadMessage,
  extractPaymentIdFromPrompt,
  formatWita,
} from "./messages";
import { getMonthlyReportData } from "@/services/report.service";
import {
  buildMonthlyReportBuffer,
  monthlyReportFilename,
  summarizeMonthlyReport,
} from "@/lib/reports/monthly-report";
import type { PaymentNotification } from "@/lib/notifications/types";

const PENDING_LIST_LIMIT = 10;

const NOT_LINKED_MESSAGE =
  "Akun Telegram Anda belum terhubung. Buka Pengaturan di dashboard admin, buat kode, lalu kirim /link <kode> ke bot ini.";

const HELP_MESSAGE = [
  "🤖 <b>Bot IPL Manager</b>",
  "",
  "Perintah yang tersedia:",
  "/link &lt;kode&gt; — hubungkan akun admin",
  "/pending — daftar pembayaran menunggu verifikasi",
  "/stats — ringkasan keuangan dan status pembayaran",
  "/laporan [bulan] [tahun] — laporan keuangan bulanan (XLSX)",
  "/unlink — putuskan akun Telegram ini",
  "/help — tampilkan pesan ini",
].join("\n");

/**
 * Mutations are accepted only from the configured admin group or from a
 * private chat with a linked admin — never from an arbitrary group the bot
 * happens to have been added to.
 */
async function isAllowedChat(message: TelegramMessage | undefined): Promise<boolean> {
  if (!message) return false;
  if (message.chat.type === "private") return true;

  const config = await getCachedTelegramBotConfig();
  return Boolean(config.groupChatId) && String(message.chat.id) === config.groupChatId;
}

async function loadPaymentNotification(
  paymentId: string
): Promise<{ notification: PaymentNotification; status: string; messageId: string | null } | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: { select: { name: true } },
      house: { select: { block: true, houseNumber: true } },
      paymentMonths: {
        select: { year: true, month: true },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
    },
  });

  if (!payment) return null;

  return {
    status: payment.status,
    messageId: payment.telegramMessageId,
    notification: {
      id: payment.id,
      userName: payment.user.name,
      block: payment.house.block,
      houseNumber: payment.house.houseNumber,
      amountMonths: payment.amountMonths,
      totalAmount: Number(payment.totalAmount),
      proofImagePath: payment.proofImagePath,
      months: payment.paymentMonths.map(({ year, month }) => ({ year, month })),
      createdAt: payment.createdAt,
    },
  };
}

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }
  if (update.message) {
    await handleMessage(update.message);
  }
}

async function handleMessage(message: TelegramMessage): Promise<void> {
  const text = message.text?.trim();
  if (!text || !message.from) return;

  // A reply to the bot's rejection prompt carries the payment id in its text —
  // that marker is the whole state store, since serverless has nowhere to keep
  // a conversation session.
  const repliedText = message.reply_to_message?.text;
  if (message.reply_to_message?.from?.is_bot && repliedText) {
    const paymentId = extractPaymentIdFromPrompt(repliedText);
    if (paymentId) {
      await handleRejectionReason(message, paymentId, text);
      return;
    }
  }

  if (!text.startsWith("/")) return;

  const [rawCommand, ...args] = text.split(/\s+/);
  // Group commands arrive as /pending@BotName
  const command = rawCommand.split("@")[0].toLowerCase();

  switch (command) {
    case "/start":
    case "/help":
      await sendMessage(message.chat.id, HELP_MESSAGE);
      return;
    case "/link":
      await handleLink(message, args[0]);
      return;
    case "/unlink":
      await handleUnlink(message);
      return;
    case "/pending":
      await handlePending(message);
      return;
    case "/stats":
      await handleStats(message);
      return;
    case "/laporan":
      await handleReport(message, args);
      return;
    case "/chatid":
      await sendMessage(
        message.chat.id,
        `Chat ID: <code>${message.chat.id}</code>\n\nSalin nilai ini ke Pengaturan → Notifikasi Bot.`
      );
      return;
    default:
      await sendMessage(message.chat.id, "Perintah tidak dikenal. Kirim /help.");
  }
}

async function handleLink(message: TelegramMessage, code?: string): Promise<void> {
  if (!code) {
    await sendMessage(
      message.chat.id,
      "Format: <code>/link KODE</code>\n\nBuat kode di dashboard admin: Pengaturan → Notifikasi Bot."
    );
    return;
  }

  const result = await redeemLinkCode(code, message.from!.id);

  if (!result.ok) {
    await sendMessage(message.chat.id, `❌ ${escapeHtml(result.error)}`);
    return;
  }

  await sendMessage(
    message.chat.id,
    `✅ Akun terhubung sebagai <b>${escapeHtml(result.name)}</b>.\n\nAnda sekarang dapat menyetujui atau menolak pembayaran lewat bot ini.`
  );
}

async function handleUnlink(message: TelegramMessage): Promise<void> {
  const removed = await unlinkTelegram(message.from!.id);
  await sendMessage(
    message.chat.id,
    removed
      ? "✅ Akun Telegram Anda telah diputuskan."
      : "Akun Telegram ini memang belum terhubung."
  );
}

async function handlePending(message: TelegramMessage): Promise<void> {
  const admin = await resolveAdminFromTelegram(message.from!.id);
  if (!admin) {
    await sendMessage(message.chat.id, NOT_LINKED_MESSAGE);
    return;
  }

  if (!(await isAllowedChat(message))) {
    await sendMessage(message.chat.id, "Grup ini tidak diizinkan menggunakan bot.");
    return;
  }

  const payments = await prisma.payment.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { name: true } },
      house: { select: { block: true, houseNumber: true } },
      paymentMonths: {
        select: { year: true, month: true },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
    },
    orderBy: { createdAt: "asc" },
    take: PENDING_LIST_LIMIT,
  });

  const total = await prisma.payment.count({ where: { status: "PENDING" } });

  if (total === 0) {
    await sendMessage(message.chat.id, "✅ Tidak ada pembayaran yang menunggu verifikasi.");
    return;
  }

  await sendMessage(
    message.chat.id,
    `📋 <b>${total} pembayaran menunggu verifikasi</b>${
      total > PENDING_LIST_LIMIT ? `\nMenampilkan ${PENDING_LIST_LIMIT} terlama.` : ""
    }`
  );

  for (const payment of payments) {
    const notification: PaymentNotification = {
      id: payment.id,
      userName: payment.user.name,
      block: payment.house.block,
      houseNumber: payment.house.houseNumber,
      amountMonths: payment.amountMonths,
      totalAmount: Number(payment.totalAmount),
      proofImagePath: payment.proofImagePath,
      months: payment.paymentMonths.map(({ year, month }) => ({ year, month })),
      createdAt: payment.createdAt,
    };

    const caption = buildUploadMessage(notification);
    const reply_markup = { inline_keyboard: buildActionKeyboard(payment.id) };

    if (payment.proofImagePath?.startsWith("http")) {
      await sendPhoto(message.chat.id, payment.proofImagePath, caption, { reply_markup });
    } else {
      await sendMessage(message.chat.id, caption, { reply_markup });
    }
  }
}

async function handleStats(message: TelegramMessage): Promise<void> {
  const admin = await resolveAdminFromTelegram(message.from!.id);
  if (!admin) {
    await sendMessage(message.chat.id, NOT_LINKED_MESSAGE);
    return;
  }

  const now = new Date();
  const [stats, monthlyIncome, unpaidHouses] = await Promise.all([
    getPaymentStats(),
    getMonthlyIncomes(now.getFullYear(), now.getMonth() + 1),
    getUnpaidHousesThisMonth(),
  ]);

  await sendMessage(
    message.chat.id,
    [
      "📊 <b>Ringkasan</b>",
      "",
      `⏳ Menunggu verifikasi: <b>${stats.pending}</b>`,
      `✅ Disetujui: <b>${stats.approved}</b>`,
      `❌ Ditolak: <b>${stats.rejected}</b>`,
      "",
      `💰 Pemasukan bulan ini: <b>${formatCurrency(monthlyIncome)}</b>`,
      `🏠 Rumah belum bayar bulan ini: <b>${unpaidHouses.length}</b>`,
      "",
      `<i>Per ${formatWita(now)} WITA</i>`,
    ].join("\n")
  );
}

const REPORT_USAGE = [
  "Format: <code>/laporan [bulan] [tahun]</code>",
  "",
  "Contoh:",
  "<code>/laporan</code> — pilih bulan lewat tombol",
  "<code>/laporan 7</code> — Juli tahun ini",
  "<code>/laporan 7 2026</code> — Juli 2026",
  "<code>/laporan 2026-07</code> — Juli 2026",
].join("\n");

/** Accepts "7", "7 2026" and "2026-07"; null means the input was unusable. */
function parseReportArgs(args: string[], now: Date): { year: number; month: number } | null {
  const compact = args[0]?.match(/^(\d{4})-(\d{1,2})$/);
  const month = compact ? Number(compact[2]) : Number(args[0]);
  const year = compact ? Number(compact[1]) : args[1] ? Number(args[1]) : now.getFullYear();

  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 2000 || year > now.getFullYear() + 1) return null;

  return { year, month };
}

async function sendReportDocument(
  chatId: number | string,
  year: number,
  month: number
): Promise<void> {
  // Acknowledge first: the workbook build takes a few seconds and a silent bot
  // invites a second request.
  await sendMessage(chatId, "⏳ Menyusun laporan…");

  try {
    const data = await getMonthlyReportData(year, month);
    const buffer = await buildMonthlyReportBuffer(data);
    const caption = buildReportCaption(year, month, summarizeMonthlyReport(data), new Date());

    await sendDocument(chatId, buffer, monthlyReportFilename(month, year), caption);
  } catch (error) {
    // The webhook swallows handler errors, so without this the admin would be
    // left staring at "Menyusun laporan…".
    console.error("[telegram] report generation failed:", error);
    await sendMessage(chatId, "❌ Gagal menyusun laporan. Coba lagi beberapa saat.");
  }
}

async function handleReport(message: TelegramMessage, args: string[]): Promise<void> {
  const admin = await resolveAdminFromTelegram(message.from!.id);
  if (!admin) {
    await sendMessage(message.chat.id, NOT_LINKED_MESSAGE);
    return;
  }

  // A full financial report is more sensitive than the /stats summary, so it
  // follows the stricter /pending chat rule.
  if (!(await isAllowedChat(message))) {
    await sendMessage(message.chat.id, "Grup ini tidak diizinkan menggunakan bot.");
    return;
  }

  if (args.length === 0) {
    await sendMessage(message.chat.id, "📊 Pilih bulan laporan:", {
      reply_markup: { inline_keyboard: buildReportMonthKeyboard(new Date()) },
    });
    return;
  }

  const parsed = parseReportArgs(args, new Date());
  if (!parsed) {
    await sendMessage(message.chat.id, `❌ Periode tidak dikenali.\n\n${REPORT_USAGE}`);
    return;
  }

  await sendReportDocument(message.chat.id, parsed.year, parsed.month);
}

async function handleReportCallback(
  query: TelegramCallbackQuery,
  payload: string
): Promise<void> {
  // A callback may only be answered once, so every rejection path has to run
  // before the acknowledgement that clears the button spinner.
  const admin = await resolveAdminFromTelegram(query.from.id);
  if (!admin) {
    await answerCallbackQuery(query.id, NOT_LINKED_MESSAGE, true);
    return;
  }

  if (!(await isAllowedChat(query.message))) {
    await answerCallbackQuery(query.id, "Chat ini tidak diizinkan.", true);
    return;
  }

  const parsed = parseReportArgs([payload], new Date());
  if (!parsed || !query.message) {
    await answerCallbackQuery(query.id, "Periode tidak dikenali.", true);
    return;
  }

  await answerCallbackQuery(query.id, "Menyusun laporan…");
  await sendReportDocument(query.message.chat.id, parsed.year, parsed.month);
}

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const data = query.data ?? "";
  const [action, paymentId] = data.split(":");

  if (action === CALLBACK_REPORT) {
    await handleReportCallback(query, paymentId ?? "");
    return;
  }

  if (action !== CALLBACK_APPROVE && action !== CALLBACK_REJECT) {
    await answerCallbackQuery(query.id, "Aksi tidak dikenal.");
    return;
  }

  const admin = await resolveAdminFromTelegram(query.from.id);
  if (!admin) {
    await answerCallbackQuery(query.id, NOT_LINKED_MESSAGE, true);
    return;
  }

  if (!(await isAllowedChat(query.message))) {
    await answerCallbackQuery(query.id, "Chat ini tidak diizinkan.", true);
    return;
  }

  const loaded = await loadPaymentNotification(paymentId);
  if (!loaded) {
    await answerCallbackQuery(query.id, "Pembayaran tidak ditemukan.", true);
    return;
  }

  // approvePayment() has no status guard of its own, so a double tap or a
  // payment already decided on the dashboard must be stopped here.
  if (loaded.status !== "PENDING") {
    await answerCallbackQuery(
      query.id,
      `Pembayaran ini sudah ${loaded.status === "APPROVED" ? "disetujui" : "ditolak"}.`,
      true
    );
    await syncCallbackMessage(query, loaded.notification, loaded.status);
    return;
  }

  if (action === CALLBACK_APPROVE) {
    await approvePayment(paymentId, admin.id);
    await answerCallbackQuery(query.id, "✅ Pembayaran disetujui.");
    await applyDecisionToMessages(query, loaded.notification, loaded.messageId, admin.name, "APPROVED");
    return;
  }

  // Rejection needs a reason, so prompt for a reply instead of acting now.
  await answerCallbackQuery(query.id, "Balas pesan berikut dengan alasan penolakan.");
  await sendMessage(query.message!.chat.id, buildRejectPrompt(paymentId, loaded.notification), {
    reply_markup: { force_reply: true, selective: true },
    reply_to_message_id: query.message!.message_id,
  });
}

async function handleRejectionReason(
  message: TelegramMessage,
  paymentId: string,
  reason: string
): Promise<void> {
  const admin = await resolveAdminFromTelegram(message.from!.id);
  if (!admin) {
    await sendMessage(message.chat.id, NOT_LINKED_MESSAGE);
    return;
  }

  if (!(await isAllowedChat(message))) return;

  const loaded = await loadPaymentNotification(paymentId);
  if (!loaded) {
    await sendMessage(message.chat.id, "❌ Pembayaran tidak ditemukan.");
    return;
  }

  if (loaded.status !== "PENDING") {
    await sendMessage(
      message.chat.id,
      `Pembayaran ini sudah ${loaded.status === "APPROVED" ? "disetujui" : "ditolak"}.`
    );
    return;
  }

  await rejectPayment(paymentId, reason);
  await dispatchPaymentDecided(paymentId, admin.name, "REJECTED", reason);
  await sendMessage(
    message.chat.id,
    `❌ Pembayaran ${escapeHtml(loaded.notification.block)}-${escapeHtml(
      loaded.notification.houseNumber
    )} ditolak.`
  );
}

/**
 * Rewrite both the original upload notification and — when the button was
 * pressed on a different message, e.g. a /pending listing — that message too.
 */
async function applyDecisionToMessages(
  query: TelegramCallbackQuery,
  notification: PaymentNotification,
  trackedMessageId: string | null,
  adminName: string,
  decision: "APPROVED" | "REJECTED"
): Promise<void> {
  await dispatchPaymentDecided(notification.id, adminName, decision);

  const clickedId = query.message?.message_id;
  if (!clickedId || String(clickedId) === trackedMessageId) return;

  const text =
    decision === "APPROVED"
      ? buildApprovedMessage(notification, adminName, new Date())
      : buildRejectedMessage(notification, adminName, "-", new Date());

  await editMessage(query.message!.chat.id, clickedId, text);
}

/**
 * Bring the clicked message in line with a decision that already happened.
 * Only that message is touched — the original group notification was already
 * rewritten when the decision was made, and it may live in a different chat.
 */
async function syncCallbackMessage(
  query: TelegramCallbackQuery,
  notification: PaymentNotification,
  status: string
): Promise<void> {
  const clickedId = query.message?.message_id;
  if (!clickedId) return;

  const payment = await prisma.payment.findUnique({
    where: { id: notification.id },
    select: { approvedAt: true, rejectionNote: true, approver: { select: { name: true } } },
  });

  const adminName = payment?.approver?.name ?? "admin";
  const at = payment?.approvedAt ?? new Date();

  const text =
    status === "APPROVED"
      ? buildApprovedMessage(notification, adminName, at)
      : buildRejectedMessage(notification, adminName, payment?.rejectionNote ?? "-", at);

  await editMessage(query.message!.chat.id, clickedId, text);
}
