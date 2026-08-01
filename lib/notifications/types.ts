/**
 * Provider-agnostic notification contract.
 *
 * Telegram is the only channel today. WhatsApp (Meta Cloud API) can be added
 * later by implementing this interface and pushing it into the channel list in
 * ./index.ts — no caller changes required.
 */

export interface PaymentNotification {
  id: string;
  userName: string;
  block: string;
  houseNumber: string;
  amountMonths: number;
  totalAmount: number;
  proofImagePath: string | null;
  months: Array<{ year: number; month: number }>;
  createdAt: Date;
}

export interface NotificationChannel {
  name: string;
  isEnabled(): Promise<boolean>;
  /**
   * Announce a newly uploaded proof. Returns a channel-specific message
   * reference (Telegram message_id) so the notification can be rewritten once
   * the payment is decided, or null when the channel has nothing to track.
   */
  notifyPaymentUploaded(payment: PaymentNotification): Promise<string | null>;
  notifyPaymentApproved(
    payment: PaymentNotification,
    messageRef: string,
    adminName: string
  ): Promise<void>;
  notifyPaymentRejected(
    payment: PaymentNotification,
    messageRef: string,
    adminName: string,
    reason: string
  ): Promise<void>;
}
