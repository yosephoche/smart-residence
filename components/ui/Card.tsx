import { cn } from "@/lib/utils";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export function Card({
  children,
  className,
  padding = "md",
  hover = false,
}: CardProps) {
  const paddings = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
  };

  return (
    <div
      className={cn(
        "bg-white rounded-xl border-2 border-gray-200 shadow-sm transition-all duration-200",
        hover && "hover:shadow-md hover:border-gray-300",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4", className)}>
      <h3 className="text-lg font-semibold text-gray-900 tracking-tight">
        {children}
      </h3>
      {action && <div>{action}</div>}
    </div>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={cn("text-sm text-gray-600", className)}>{children}</div>;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        "mt-4 pt-4 border-t-2 border-gray-100 flex items-center gap-3",
        className
      )}
    >
      {children}
    </div>
  );
}
