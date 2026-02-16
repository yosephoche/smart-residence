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
    MONTHLY_FEES: t('monthly_fees'),
    LATE_FEES: t('late_fees'),
    GUEST_PARKING: t('guest_parking'),
    FACILITY_RENTAL: t('facility_rental'),
    MAINTENANCE_CHARGE: t('maintenance_charge'),
    REGISTRATION_FEE: t('registration_fee'),
    OTHER: t('other'),
  };

  const variant = categoryVariants[category] || "default";
  return (
    <Badge variant={variant} size={size}>
      {categoryLabels[category] || category}
    </Badge>
  );
}
