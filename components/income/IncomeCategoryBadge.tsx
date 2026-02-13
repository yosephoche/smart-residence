import Badge from "@/components/ui/Badge";
import { getIncomeCategoryLabel } from "@/lib/calculations";

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
  const variant = categoryVariants[category] || "default";
  return (
    <Badge variant={variant} size={size}>
      {getIncomeCategoryLabel(category)}
    </Badge>
  );
}
