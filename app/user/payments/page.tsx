'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Filter, Download } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatPaymentMonth } from '@/lib/calculations';
import { toast } from 'sonner';

interface Payment {
  id: string;
  amountMonths: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  paymentMonths?: Array<{ year: number; month: number }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as const as any,
    },
  },
} as const;

const statusConfig = {
  APPROVED: {
    label: 'Lunas',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  PENDING: {
    label: 'Menunggu',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  REJECTED: {
    label: 'Ditolak',
    color: 'text-red-600',
    bg: 'bg-red-50',
  },
};

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await fetch('/api/payments');
        const data = await response.json();
        setPayments(data);
      } catch (error) {
        console.error('Error fetching payments:', error);
        toast.error('Gagal memuat data pembayaran');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, []);

  const totalPaid = payments
    .filter((p) => p.status === 'APPROVED')
    .reduce((sum, p) => sum + Number(p.totalAmount), 0);

  const paidCount = payments.filter((p) => p.status === 'APPROVED').length;

  if (isLoading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="px-4 pt-2 pb-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-slate-900">Pembayaran</h1>
        <p className="text-sm text-slate-400 mt-0.5">Riwayat pembayaran IPL Anda</p>
      </motion.div>

      {/* Summary Card */}
      <motion.div variants={itemVariants} className="bg-blue-600 rounded-2xl p-4 text-white">
        <p className="text-xs text-blue-200 font-medium">Total Dibayar (2025)</p>
        <p className="text-2xl font-bold mt-1">{formatCurrency(totalPaid)}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
            {paidCount} transaksi lunas
          </span>
        </div>
      </motion.div>

      {/* Filter Row */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <button
          onClick={() => toast.info('Fitur filter akan segera hadir')}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white rounded-lg px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
        <button
          onClick={() => toast.info('Fitur unduh akan segera hadir')}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white rounded-lg px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
        >
          <Download className="w-3.5 h-3.5" />
          Unduh
        </button>
      </motion.div>

      {/* Payment List */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        {payments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400">Belum ada pembayaran</p>
          </div>
        ) : (
          payments.map((payment, index) => {
            const config = statusConfig[payment.status];
            const monthLabel = payment.paymentMonths?.[0]
              ? formatPaymentMonth(payment.paymentMonths[0])
              : '-';

            return (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: 0.1 + index * 0.04,
                  duration: 0.3,
                }}
                className="flex items-center justify-between px-4 py-3.5 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800">IPL {monthLabel}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(payment.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {formatCurrency(Number(payment.totalAmount))}
                  </p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                    {config.label}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}
