import { cn } from "@/lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  className?: string;
  dot?: boolean;
}

export default function Badge({
  children,
  variant = "default",
  size = "md",
  className,
  dot = false,
}: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-300",
    success: "bg-success-50 text-success-700 border-success-200",
    danger: "bg-danger-50 text-danger-700 border-danger-200",
    warning: "bg-warning-50 text-warning-700 border-warning-200",
    info: "bg-primary-50 text-primary-700 border-primary-200",
  };

  const dotColors = {
    default: "bg-slate-500",
    success: "bg-success-500",
    danger: "bg-danger-500",
    warning: "bg-warning-500",
    info: "bg-primary-500",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border tracking-tight",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full animate-pulse",
            dotColors[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
