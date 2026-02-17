import React from 'react';

interface CircularProgressProps {
  value: number; // Current value (e.g., months paid)
  max?: number; // Maximum value (default 12)
  size?: 'sm' | 'md' | 'lg';
  strokeWidth?: number;
  showLabel?: boolean;
  label?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 12,
  size = 'md',
  strokeWidth = 8,
  showLabel = true,
  label = 'bulan'
}) => {
  // Size configurations
  const sizeMap = {
    sm: 120,
    md: 160,
    lg: 200
  };

  const diameter = sizeMap[size];
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min((value / max) * 100, 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={diameter}
        height={diameter}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />

        {/* Progress circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-all duration-1000 ease-out"
          style={{
            animation: 'progress-animation 1s ease-out'
          }}
        />
      </svg>

      {/* Center text */}
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-900">
            {value}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            / {max} {label}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes progress-animation {
          from {
            stroke-dashoffset: ${circumference};
          }
          to {
            stroke-dashoffset: ${strokeDashoffset};
          }
        }
      `}</style>
    </div>
  );
};

export default CircularProgress;
