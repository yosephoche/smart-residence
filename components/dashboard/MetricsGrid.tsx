import React from 'react';
import { CheckCircle, DollarSign, Clock, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface MetricsGridProps {
  totalPaidMonths: number;
  totalPaidAmount: number;
  pendingCount: number;
  currentMonthStatus: {
    status: string;
    label: string;
    color: string;
  };
}

const MetricsGrid: React.FC<MetricsGridProps> = ({
  totalPaidMonths,
  totalPaidAmount,
  pendingCount,
  currentMonthStatus
}) => {
  const metrics = [
    {
      icon: CheckCircle,
      label: 'Total Bulan Bayar',
      value: `${totalPaidMonths} Bulan`,
      iconColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    {
      icon: DollarSign,
      label: 'Total Dibayar',
      value: new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(totalPaidAmount),
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    {
      icon: Clock,
      label: 'Pembayaran Pending',
      value: `${pendingCount} Transaksi`,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
    },
    {
      icon: Calendar,
      label: 'Status Bulan Ini',
      value: currentMonthStatus.label,
      iconColor: currentMonthStatus.color,
      bgColor: 'bg-gray-50 dark:bg-gray-900/20'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col space-y-3">
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full ${metric.bgColor} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${metric.iconColor}`} />
              </div>

              {/* Label */}
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {metric.label}
                </p>
                <p className={`text-sm md:text-base font-semibold ${metric.iconColor}`}>
                  {metric.value}
                </p>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default MetricsGrid;
