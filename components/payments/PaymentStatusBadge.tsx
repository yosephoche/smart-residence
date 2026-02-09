import Badge from "@/components/ui/Badge";
import { PaymentStatus } from "@/types";

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
  const variants: Record<PaymentStatus, "success" | "warning" | "danger"> = {
    APPROVED: "success",
    PENDING: "warning",
    REJECTED: "danger",
  };

  const labels: Record<PaymentStatus, string> = {
    APPROVED: "Approved",
    PENDING: "Pending",
    REJECTED: "Rejected",
  };

  return (
    <Badge variant={variants[status]} size={size} dot={showDot}>
      {labels[status]}
    </Badge>
  );
}
