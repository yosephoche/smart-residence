import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { CheckCircle, Clock, XCircle, FileText } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Payment {
  id: string;
  amountMonths: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  paymentMonths?: Array<{
    year: number;
    month: number;
  }>;
}

interface RecentActivityProps {
  payments: Payment[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ payments }) => {
  // Status configuration
  const statusConfig = {
    APPROVED: {
      icon: CheckCircle,
      label: 'Disetujui',
      variant: 'success' as const,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    PENDING: {
      icon: Clock,
      label: 'Menunggu',
      variant: 'warning' as const,
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
    },
    REJECTED: {
      icon: XCircle,
      label: 'Ditolak',
      variant: 'danger' as const,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    }
  };

  // Format month range for payment
  const formatMonthRange = (payment: Payment) => {
    if (!payment.paymentMonths || payment.paymentMonths.length === 0) {
      return 'N/A';
    }

    const months = payment.paymentMonths.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
      'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    if (months.length === 1) {
      const m = months[0];
      return `${monthNames[m.month - 1]} ${m.year}`;
    }

    const first = months[0];
    const last = months[months.length - 1];

    return `${monthNames[first.month - 1]} ${first.year} - ${monthNames[last.month - 1]} ${last.year}`;
  };

  // Empty state
  if (payments.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <FileText className="w-12 h-12 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">
            Belum ada pembayaran
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Aktivitas Terbaru
        </h2>
        <Link
          href="/user/history"
          className="text-sm text-primary hover:text-primary-dark font-medium"
        >
          Lihat Semua
        </Link>
      </div>

      {/* Payment List */}
      <div className="space-y-3">
        {payments.slice(0, 5).map((payment, index) => {
          const status = statusConfig[payment.status];
          const Icon = status.icon;

          return (
            <div key={payment.id}>
              <div className="flex items-center gap-3 py-3">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-full ${status.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${status.color}`} />
                </div>

                {/* Payment Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {payment.amountMonths} Bulan IPL
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(payment.createdAt)}
                    </p>
                    <span className="text-xs text-gray-400">•</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {formatMonthRange(payment)}
                    </p>
                  </div>
                </div>

                {/* Amount & Status */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('id-ID', {
                      style: 'currency',
                      currency: 'IDR',
                      minimumFractionDigits: 0
                    }).format(payment.totalAmount)}
                  </p>
                  <Badge variant={status.variant} className="text-xs">
                    {status.label}
                  </Badge>
                </div>
              </div>

              {/* Divider (except last item) */}
              {index < Math.min(payments.length, 5) - 1 && (
                <div className="border-b border-gray-200 dark:border-gray-700" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default RecentActivity;
