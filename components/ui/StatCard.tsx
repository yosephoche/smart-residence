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
    primary: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-500",
    info: "bg-blue-50 text-blue-600",
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{title}</p>
          <div className="relative group">
            <p
              className={cn(
                "font-bold text-slate-900 tracking-tight mb-1 leading-tight",
                textSizeClass
              )}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              {displayValue}
            </p>
            {/* Tooltip for full value when abbreviated */}
            {processedValue.isAbbreviated && showTooltip && isHovered && (
              <div className="absolute z-50 bottom-full left-0 mb-2 px-3 py-2 bg-slate-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap">
                <div className="relative">
                  {processedValue.full}
                  <div className="absolute top-full left-4 -mt-1">
                    <div className="border-4 border-transparent border-t-slate-900"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <svg
                className={cn("w-3.5 h-3.5", trend.isPositive ? "text-emerald-500" : "text-red-500")}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                {trend.isPositive ? (
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" clipRule="evenodd" />
                ) : (
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 13.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                )}
              </svg>
              <span className={cn("text-xs font-semibold", trend.isPositive ? "text-emerald-600" : "text-red-500")}>
                {trend.value}
              </span>
            </div>
          )}
        </div>
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", variants[variant])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
