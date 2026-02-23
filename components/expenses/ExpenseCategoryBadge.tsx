'use client';

import Badge from "@/components/ui/Badge";
import { useTranslations } from "next-intl";

interface Props {
  category: string;
  size?: "sm" | "md" | "lg";
}

const categoryVariants: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  MAINTENANCE: "warning",
  SECURITY: "info",
  UTILITIES: "info",
  CLEANING: "success",
  LANDSCAPING: "success",
  ADMINISTRATION: "default",
  OTHER: "default",
};

export default function ExpenseCategoryBadge({ category, size = "sm" }: Props) {
  const t = useTranslations('expenses.categories');

  const categoryLabels: Record<string, string> = {
    MAINTENANCE: t('MAINTENANCE'),
    SECURITY: t('SECURITY'),
    UTILITIES: t('UTILITIES'),
    CLEANING: t('CLEANING'),
    LANDSCAPING: t('LANDSCAPING'),
    ADMINISTRATION: t('ADMINISTRATION'),
    OTHER: t('OTHER'),
  };

  const variant = categoryVariants[category] || "default";
  return (
    <Badge variant={variant} size={size}>
      {categoryLabels[category] || category}
    </Badge>
  );
}
