import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { issueLinkCode } from "@/lib/telegram/auth";
import { prisma } from "@/lib/prisma";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

/**
 * GET /api/telegram/link-code
 * Report whether the signed-in admin already linked a Telegram account.
 */
export const GET = auth(async (req) => {
  const session = req.auth;

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: session?.user ? "Forbidden" : "Unauthorized" },
      { status: session?.user ? 403 : 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramUserId: true },
  });

  return NextResponse.json(
    serializePrismaJson({ linked: Boolean(user?.telegramUserId) })
  );
});

/**
 * POST /api/telegram/link-code
 * Issue a one-time code the admin redeems by sending /link <code> to the bot.
 */
export const POST = auth(async (req) => {
  const session = req.auth;

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: session?.user ? "Forbidden" : "Unauthorized" },
      { status: session?.user ? 403 : 401 }
    );
  }

  try {
    const { code, expiresAt } = await issueLinkCode(session.user.id);
    return NextResponse.json(serializePrismaJson({ code, expiresAt }));
  } catch (error) {
    console.error("Error issuing telegram link code:", error);
    return NextResponse.json(
      { error: "Failed to generate link code" },
      { status: 500 }
    );
  }
});
