import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { handleUpdate } from "@/lib/telegram/handlers";
import type { TelegramUpdate } from "@/lib/telegram/client";

/**
 * Telegram webhook receiver.
 *
 * Middleware excludes /api, so no session is involved here — the only
 * authentication is the secret token Telegram echoes back on every request.
 */

function isValidSecret(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !received) return false;

  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!isValidSecret(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    await handleUpdate(update);
  } catch (error) {
    // Telegram retries any non-2xx response, so a handler bug would turn into
    // an endless redelivery loop. Swallow it here and rely on the log.
    console.error("[telegram] handler error:", error);
  }

  return NextResponse.json({ ok: true });
}
