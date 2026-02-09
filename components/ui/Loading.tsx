import { cn } from "@/lib/utils";

export interface LoadingProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  text?: string;
}

export default function Loading({ size = "md", className, text }: LoadingProps) {
  const sizes = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative">
        <div
          className={cn(
            "border-4 border-gray-200 rounded-full",
            sizes[size]
          )}
        />
        <div
          className={cn(
            "absolute top-0 left-0 border-4 border-primary-600 rounded-full border-t-transparent animate-spin",
            sizes[size]
          )}
        />
      </div>
      {text && (
        <p className="text-sm text-gray-600 animate-pulse font-medium">{text}</p>
      )}
    </div>
  );
}

export function LoadingOverlay({ text }: { text?: string }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl p-8 shadow-2xl border-2 border-gray-200 animate-in zoom-in-95 duration-200">
        <Loading size="lg" text={text} />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded-lg",
        className
      )}
      style={{
        animation: "shimmer 2s infinite linear",
      }}
    />
  );
}
