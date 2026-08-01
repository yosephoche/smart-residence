import { getCachedTelegramBotConfig } from "@/lib/cache/telegram-bot";
import {
  editMessage,
  isTelegramConfigured,
  sendMessage,
  sendPhoto,
} from "@/lib/telegram/client";
import {
  buildActionKeyboard,
  buildApprovedMessage,
  buildRejectedMessage,
  buildUploadMessage,
} from "@/lib/telegram/messages";
import type { NotificationChannel, PaymentNotification } from "./types";

async function groupChatId(): Promise<string | null> {
  if (!isTelegramConfigured()) return null;
  const config = await getCachedTelegramBotConfig();
  if (!config.enabled || !config.groupChatId) return null;
  return config.groupChatId;
}

export const telegramChannel: NotificationChannel = {
  name: "telegram",

  async isEnabled() {
    return (await groupChatId()) !== null;
  },

  async notifyPaymentUploaded(payment: PaymentNotification) {
    const chatId = await groupChatId();
    if (!chatId) return null;

    const config = await getCachedTelegramBotConfig();
    if (!config.notifyOnUpload) return null;

    const caption = buildUploadMessage(payment);
    const reply_markup = { inline_keyboard: buildActionKeyboard(payment.id) };

    // Older records may hold a relative /uploads path from the pre-Cloudinary
    // days; Telegram can only fetch absolute URLs, so those fall back to text.
    const isFetchableUrl = payment.proofImagePath?.startsWith("http");

    const message = isFetchableUrl
      ? await sendPhoto(chatId, payment.proofImagePath!, caption, { reply_markup })
      : await sendMessage(chatId, caption, { reply_markup });

    return String(message.message_id);
  },

  async notifyPaymentApproved(payment, messageRef, adminName) {
    const chatId = await groupChatId();
    if (!chatId) return;
    await editMessage(
      chatId,
      messageRef,
      buildApprovedMessage(payment, adminName, new Date())
    );
  },

  async notifyPaymentRejected(payment, messageRef, adminName, reason) {
    const chatId = await groupChatId();
    if (!chatId) return;
    await editMessage(
      chatId,
      messageRef,
      buildRejectedMessage(payment, adminName, reason, new Date())
    );
  },
};
