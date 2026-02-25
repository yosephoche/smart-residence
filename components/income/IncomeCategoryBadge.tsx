'use client';

import Badge from "@/components/ui/Badge";
import { useTranslations } from "next-intl";

interface Props {
  category: string;
  size?: "sm" | "md" | "lg";
}

const categoryVariants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  MONTHLY_FEES: "success",
  LATE_FEES: "warning",
  GUEST_PARKING: "info",
  FACILITY_RENTAL: "info",
  MAINTENANCE_CHARGE: "warning",
  REGISTRATION_FEE: "success",
  OTHER: "default",
};

export default function IncomeCategoryBadge({ category, size = "sm" }: Props) {
  const t = useTranslations('income.categories');

  const categoryLabels: Record<string, string> = {
    MONTHLY_FEES: t('MONTHLY_FEES'),
    LATE_FEES: t('LATE_FEES'),
    GUEST_PARKING: t('GUEST_PARKING'),
    FACILITY_RENTAL: t('FACILITY_RENTAL'),
    MAINTENANCE_CHARGE: t('MAINTENANCE_CHARGE'),
    REGISTRATION_FEE: t('REGISTRATION_FEE'),
    OTHER: t('OTHER'),
  };

  const variant = categoryVariants[category] || "default";
  return (
    <Badge variant={variant} size={size}>
      {categoryLabels[category] || category}
    </Badge>
  );
}
