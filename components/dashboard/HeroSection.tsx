import React from 'react';
import CircularProgress from '@/components/ui/CircularProgress';
import Badge from '@/components/ui/Badge';

interface HeroSectionProps {
  userName: string;
  paidMonths: number;
  currentMonthStatus: 'APPROVED' | 'PENDING' | 'UNPAID';
  currentMonthLabel: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  userName,
  paidMonths,
  currentMonthStatus,
  currentMonthLabel
}) => {
  // Status badge configuration
  const statusConfig = {
    APPROVED: {
      label: 'Lunas',
      variant: 'success' as const,
      color: 'text-green-700 dark:text-green-400'
    },
    PENDING: {
      label: 'Menunggu',
      variant: 'warning' as const,
      color: 'text-yellow-700 dark:text-yellow-400'
    },
    UNPAID: {
      label: 'Belum Bayar',
      variant: 'danger' as const,
      color: 'text-red-700 dark:text-red-400'
    }
  };

  const status = statusConfig[currentMonthStatus];

  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 rounded-xl p-6 md:p-8">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-900">
            Selamat Datang, {userName}
          </h1>
          <p className="text-sm md:text-base text-gray-700 dark:text-gray-700 mt-2">
            Status pembayaran bulan {currentMonthLabel}
          </p>
        </div>

        {/* Circular Progress */}
        <div className="my-4">
          <CircularProgress
            value={paidMonths}
            max={12}
            size="lg"
            label="bulan"
          />
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Status:
          </span>
          <Badge variant={status.variant} className="text-sm px-3 py-1">
            {status.label}
          </Badge>
        </div>

        {/* Progress Info */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-semibold text-gray-900 dark:text-gray-900">
            {paidMonths}
          </span>{' '}
          dari 12 bulan terbayar
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
