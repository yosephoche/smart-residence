"use client";

import { useState, useMemo } from "react";
import { cn, formatCurrencyCompact, getDynamicTextSize } from "@/lib/utils";

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "primary" | "success" | "warning" | "danger" | "info";
  compactNumbers?: boolean;
  compactThreshold?: number;
  showTooltip?: boolean;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = "primary",
  compactNumbers = false,
  compactThreshold = 10_000_000,
  showTooltip = true,
}: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Process value for compact display if needed
  const processedValue = useMemo(() => {
    if (typeof value === "number" && compactNumbers) {
      return formatCurrencyCompact(value, {
        threshold: compactThreshold,
        precision: 2,
        forceCompact: false,
      });
    }
    return {
      display: String(value),
      full: String(value),
      isAbbreviated: false,
    };
  }, [value, compactNumbers, compactThreshold]);

  // Determine which value to display
  const displayValue = processedValue.display;

  // Get dynamic font size based on display value length
  const textSizeClass = getDynamicTextSize(displayValue, 10);

  const variants = {
    primary: "bg-primary-50 text-primary-600 border-primary-200",
    success: "bg-success-50 text-success-600 border-success-200",
    warning: "bg-warning-50 text-warning-600 border-warning-200",
    danger: "bg-danger-50 text-danger-600 border-danger-200",
    info: "bg-primary-50 text-primary-600 border-primary-200",
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="relative group">
            <p
              className={cn(
                "font-bold text-gray-900 tracking-tight mb-1 leading-tight",
                textSizeClass
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {displayValue}
            </p>
            {/* Tooltip for full value when abbreviated */}
            {processedValue.isAbbreviated && showTooltip && isHovered && (
              <div className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap">
                <div className="relative">
                  {processedValue.full}
                  {/* Arrow pointing down */}
                  <div className="absolute top-full left-4 -mt-1">
                    <div className="border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <svg
                className={cn(
                  "w-4 h-4",
                  trend.isPositive ? "text-success-500" : "text-danger-500"
                )}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                {trend.isPositive ? (
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                ) : (
                  <path
                    fillRule="evenodd"
                    d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                )}
              </svg>
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-success-600" : "text-danger-600"
                )}
              >
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={cn("w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 flex items-center justify-center flex-shrink-0", variants[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
