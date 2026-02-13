"use client";

import { cn } from "@/lib/utils";

interface FloatingActionButtonProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

export default function FloatingActionButton({
  onClick,
  icon,
  label = "Action",
  className,
}: FloatingActionButtonProps) {
  // Default icon: Plus icon
  const defaultIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );

  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        // Position: Fixed bottom-right, mobile/tablet only
        "fixed bottom-6 right-6 lg:hidden",
        // Size: Responsive (56px mobile, 64px tablet)
        "w-14 h-14 md:w-16 md:h-16",
        // Style: Blue brand color matching existing buttons
        "bg-primary-600 hover:bg-primary-700 active:bg-primary-800",
        "text-white rounded-full shadow-lg hover:shadow-xl",
        // Transitions
        "transition-all duration-200",
        "hover:scale-110 active:scale-95",
        // Accessibility
        "focus:outline-none focus:ring-4 focus:ring-primary-300 focus:ring-offset-2",
        // Z-index: Above content, below modals
        "z-40",
        // Flex center for icon
        "flex items-center justify-center",
        className
      )}
    >
      {icon || defaultIcon}
    </button>
  );
}
