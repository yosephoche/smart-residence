import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCachedTelegramBotConfig } from "@/lib/cache/telegram-bot";
import { isTelegramConfigured, sendMessage } from "@/lib/telegram/client";

/**
 * POST /api/telegram/test
 * Send a probe message to the configured group so the admin can confirm the
 * token, the chat id, and the bot's group membership in one click.
 */
export const POST = auth(async (req) => {
  const session = req.auth;

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: session?.user ? "Forbidden" : "Unauthorized" },
      { status: session?.user ? 403 : 401 }
    );
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN belum diatur di environment server" },
      { status: 400 }
    );
  }

  const config = await getCachedTelegramBotConfig();
  if (!config.groupChatId) {
    return NextResponse.json(
      { error: "Chat ID grup belum diisi. Simpan konfigurasi terlebih dahulu." },
      { status: 400 }
    );
  }

  try {
    await sendMessage(
      config.groupChatId,
      `✅ Tes koneksi berhasil.\n\nBot IPL Manager siap mengirim notifikasi ke grup ini.\nDikirim oleh <b>${session.user.name ?? "admin"}</b>.`
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Telegram test message failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mengirim pesan tes ke Telegram",
      },
      { status: 502 }
    );
  }
});
