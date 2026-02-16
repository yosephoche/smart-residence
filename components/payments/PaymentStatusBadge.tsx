'use client';

import Badge from "@/components/ui/Badge";
import { PaymentStatus } from "@/types";
import { useTranslations } from "next-intl";

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
  size?: "sm" | "md" | "lg";
  showDot?: boolean;
}

export default function PaymentStatusBadge({
  status,
  size = "md",
  showDot = false,
}: PaymentStatusBadgeProps) {
  const t = useTranslations('common.status');

  const variants: Record<PaymentStatus, "success" | "warning" | "danger"> = {
    APPROVED: "success",
    PENDING: "warning",
    REJECTED: "danger",
  };

  const labels: Record<PaymentStatus, string> = {
    APPROVED: t('approved'),
    PENDING: t('pending'),
    REJECTED: t('rejected'),
  };

  return (
    <Badge variant={variants[status]} size={size} dot={showDot}>
      {labels[status]}
    </Badge>
  );
}
