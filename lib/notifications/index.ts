import { prisma } from "@/lib/prisma";
import { telegramChannel } from "./telegram-channel";
import type { NotificationChannel, PaymentNotification } from "./types";

export type { PaymentNotification, NotificationChannel } from "./types";

/** Add further channels (e.g. WhatsApp Cloud API) here. */
const channels: NotificationChannel[] = [telegramChannel];

type PaymentWithRelations = NonNullable<
  Awaited<ReturnType<typeof loadPayment>>
>;

async function loadPayment(paymentId: string) {
  return prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: { select: { name: true } },
      house: { select: { block: true, houseNumber: true } },
      paymentMonths: {
        select: { year: true, month: true },
        orderBy: [{ year: "asc" as const }, { month: "asc" as const }],
      },
    },
  });
}

function toNotification(payment: PaymentWithRelations): PaymentNotification {
  return {
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
}

/**
 * Announce a newly uploaded proof on every enabled channel and remember the
 * message reference so the notification can be rewritten once decided.
 *
 * Each channel is isolated: a failing bot must never break a resident's upload.
 */
export async function dispatchPaymentUploaded(paymentId: string): Promise<void> {
  const payment = await loadPayment(paymentId);
  if (!payment) return;

  const notification = toNotification(payment);

  for (const channel of channels) {
    try {
      const messageRef = await channel.notifyPaymentUploaded(notification);
      // Only Telegram tracks a reference today; the column is named after it.
      if (messageRef && channel.name === "telegram") {
        await prisma.payment.update({
          where: { id: paymentId },
          data: { telegramMessageId: messageRef },
        });
      }
    } catch (error) {
      console.error(`[notifications] ${channel.name} upload notify failed:`, error);
    }
  }
}

/**
 * Rewrite the pending notification after a decision, whichever surface made it
 * (dashboard or bot), so admins never act on an already-handled payment.
 */
export async function dispatchPaymentDecided(
  paymentId: string,
  adminName: string,
  decision: "APPROVED" | "REJECTED",
  reason?: string
): Promise<void> {
  const payment = await loadPayment(paymentId);
  if (!payment?.telegramMessageId) return;

  const notification = toNotification(payment);

  for (const channel of channels) {
    try {
      if (decision === "APPROVED") {
        await channel.notifyPaymentApproved(
          notification,
          payment.telegramMessageId,
          adminName
        );
      } else {
        await channel.notifyPaymentRejected(
          notification,
          payment.telegramMessageId,
          adminName,
          reason ?? "-"
        );
      }
    } catch (error) {
      console.error(`[notifications] ${channel.name} decision notify failed:`, error);
    }
  }
}

/** Fan out a decision update over many payments (bulk approve). */
export async function dispatchBulkDecided(
  paymentIds: string[],
  adminName: string,
  decision: "APPROVED" | "REJECTED"
): Promise<void> {
  const tracked = await prisma.payment.findMany({
    where: { id: { in: paymentIds }, telegramMessageId: { not: null } },
    select: { id: true },
  });

  for (const { id } of tracked) {
    await dispatchPaymentDecided(id, adminName, decision);
  }
}
