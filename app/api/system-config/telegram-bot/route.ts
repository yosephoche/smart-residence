import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { setTelegramBotConfig } from "@/services/systemConfig.service";
import {
  getCachedTelegramBotConfig,
  invalidateTelegramBotCache,
} from "@/lib/cache/telegram-bot";
import { isTelegramConfigured } from "@/lib/telegram/client";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

const telegramBotSchema = z.object({
  enabled: z.boolean(),
  // Group chat ids are negative, private chat ids positive; empty disables.
  groupChatId: z
    .string()
    .trim()
    .regex(/^-?\d*$/, "Chat ID harus berupa angka"),
  notifyOnUpload: z.boolean(),
});

/**
 * GET /api/system-config/telegram-bot
 * Fetch Telegram bot configuration (admin-only — internal integration config)
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const config = await getCachedTelegramBotConfig();
    return NextResponse.json(
      serializePrismaJson({
        ...config,
        // Whether the token env var is present, never the token itself.
        tokenConfigured: isTelegramConfigured(),
      })
    );
  } catch (error) {
    console.error("Error fetching telegram bot config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system-config/telegram-bot
 * Update Telegram bot configuration (admin-only)
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const validationResult = telegramBotSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const config = validationResult.data;

    if (config.enabled && !config.groupChatId) {
      return NextResponse.json(
        { error: "Chat ID grup wajib diisi saat notifikasi diaktifkan" },
        { status: 400 }
      );
    }

    await setTelegramBotConfig(config, session.user.id);
    invalidateTelegramBotCache();

    return NextResponse.json(
      serializePrismaJson({
        success: true,
        message: "Configuration updated successfully",
        config,
      })
    );
  } catch (error) {
    console.error("Error updating telegram bot config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
