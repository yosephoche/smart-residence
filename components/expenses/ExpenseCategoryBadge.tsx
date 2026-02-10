import Badge from "@/components/ui/Badge";
import { getExpenseCategoryLabel } from "@/lib/calculations";

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
  const variant = categoryVariants[category] || "default";
  return (
    <Badge variant={variant} size={size}>
      {getExpenseCategoryLabel(category)}
    </Badge>
  );
}
