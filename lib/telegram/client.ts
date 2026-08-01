/**
 * Thin wrapper over the Telegram Bot API.
 *
 * Uses native fetch — the project has no HTTP client dependency and the
 * Node runtime in Next 15 provides fetch globally.
 */

const API_BASE = "https://api.telegram.org";

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface TelegramApiResult<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

export interface TelegramMessage {
  message_id: number;
  chat: { id: number; type: string };
  text?: string;
  caption?: string;
  reply_to_message?: TelegramMessage;
  from?: TelegramUser;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  username?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/**
 * Call a Telegram Bot API method. Throws on network failure or a non-ok
 * response so callers can log it — never let the token reach the message.
 */
export async function callTelegram<T = unknown>(
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(`${API_BASE}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as TelegramApiResult<T>;

  if (!payload.ok) {
    throw new Error(
      `Telegram ${method} failed (${payload.error_code}): ${payload.description}`
    );
  }

  return payload.result as T;
}

export async function sendMessage(
  chatId: string | number,
  text: string,
  options: Record<string, unknown> = {}
): Promise<TelegramMessage> {
  return callTelegram<TelegramMessage>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...options,
  });
}

export async function sendPhoto(
  chatId: string | number,
  photoUrl: string,
  caption: string,
  options: Record<string, unknown> = {}
): Promise<TelegramMessage> {
  return callTelegram<TelegramMessage>("sendPhoto", {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
    ...options,
  });
}

/**
 * Rewrite an already-sent notification. A photo message carries its text in
 * `caption`, so editMessageText would fail on it — try the caption edit first
 * and fall back to the text edit for plain messages.
 */
export async function editMessage(
  chatId: string | number,
  messageId: string | number,
  text: string
): Promise<void> {
  try {
    await callTelegram("editMessageCaption", {
      chat_id: chatId,
      message_id: Number(messageId),
      caption: text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] },
    });
  } catch {
    await callTelegram("editMessageText", {
      chat_id: chatId,
      message_id: Number(messageId),
      text,
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: [] },
    });
  }
}

export async function answerCallbackQuery(
  callbackQueryId: string,
  text: string,
  showAlert = false
): Promise<void> {
  await callTelegram("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

/** Telegram renders a small HTML subset; anything else must be escaped. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
