import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const LINK_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
// Ambiguous characters (0/O, 1/I) are excluded — codes get retyped by hand.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export interface LinkedAdmin {
  id: string;
  name: string;
}

/**
 * The single authorization gate for every bot mutation: a Telegram user id
 * only counts if it is bound to an account that is still an ADMIN.
 */
export async function resolveAdminFromTelegram(
  telegramUserId: number | string
): Promise<LinkedAdmin | null> {
  const admin = await prisma.user.findFirst({
    where: { telegramUserId: String(telegramUserId), role: "ADMIN" },
    select: { id: true, name: true },
  });

  return admin;
}

export function generateLinkCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** Issue a fresh one-time code for an admin, replacing any previous one. */
export async function issueLinkCode(
  userId: string
): Promise<{ code: string; expiresAt: Date }> {
  const code = generateLinkCode();
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);

  await prisma.user.update({
    where: { id: userId },
    data: { telegramLinkCode: code, telegramLinkExpiresAt: expiresAt },
  });

  return { code, expiresAt };
}

export type LinkResult =
  | { ok: true; name: string }
  | { ok: false; error: string };

/**
 * Redeem a code sent through the bot. Consumes the code on success so it can
 * never be replayed, and rejects anything issued to a non-admin.
 */
export async function redeemLinkCode(
  code: string,
  telegramUserId: number | string
): Promise<LinkResult> {
  const user = await prisma.user.findFirst({
    where: { telegramLinkCode: code.toUpperCase() },
    select: {
      id: true,
      name: true,
      role: true,
      telegramLinkExpiresAt: true,
    },
  });

  if (!user) {
    return { ok: false, error: "Kode tidak ditemukan. Periksa kembali kodenya." };
  }

  if (user.role !== "ADMIN") {
    return { ok: false, error: "Hanya admin yang dapat menghubungkan akun." };
  }

  if (!user.telegramLinkExpiresAt || user.telegramLinkExpiresAt < new Date()) {
    return {
      ok: false,
      error: "Kode sudah kedaluwarsa. Buat kode baru dari halaman Pengaturan.",
    };
  }

  // Another account may already hold this Telegram id (unique column); clear it
  // first so re-linking to a different admin account does not hit a constraint.
  await prisma.user.updateMany({
    where: { telegramUserId: String(telegramUserId) },
    data: { telegramUserId: null },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      telegramUserId: String(telegramUserId),
      telegramLinkCode: null,
      telegramLinkExpiresAt: null,
    },
  });

  return { ok: true, name: user.name };
}

export async function unlinkTelegram(telegramUserId: number | string): Promise<boolean> {
  const result = await prisma.user.updateMany({
    where: { telegramUserId: String(telegramUserId) },
    data: { telegramUserId: null },
  });
  return result.count > 0;
}
