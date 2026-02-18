'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Home as HomeIcon,
  CheckCircle,
  AlertCircle,
  Upload as UploadIcon,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet
} from 'lucide-react';
import { useAuth } from '@/lib/auth-client';
import { Card } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatPaymentMonth } from '@/lib/calculations';
import { FinancialChart } from './FinancialChart';

interface House {
  id: string;
  houseNumber: string;
  block: string;
  houseType?: {
    typeName: string;
    price: number;
    description?: string;
  };
}

interface Payment {
  id: string;
  amountMonths: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  paymentMonths?: Array<{ year: number; month: number }>;
}

interface FinancialData {
  month: string;
  income: number;
  expense: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const as any,
    },
  },
} as const;

export function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [house, setHouse] = useState<House | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        const [housesRes, paymentsRes, financialRes] = await Promise.all([
          fetch(`/api/houses?userId=${user.id}`),
          fetch('/api/payments'),
          fetch('/api/user/financial-summary'),
        ]);

        const [housesData, paymentsData, financialDataRes] = await Promise.all([
          housesRes.json(),
          paymentsRes.json(),
          financialRes.json(),
        ]);

        setHouse(housesData[0] || null);
        setPayments(paymentsData);
        setFinancialData(financialDataRes);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return 'Selamat pagi';
    if (hour < 15) return 'Selamat siang';
    if (hour < 18) return 'Selamat sore';
    return 'Selamat malam';
  };

  // Current month payment status
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const hasApprovedPayment = payments.some(
    (p) =>
      p.status === 'APPROVED' &&
      p.paymentMonths?.some((pm) => pm.year === currentYear && pm.month === currentMonth)
  );

  const hasPendingPayment = payments.some(
    (p) =>
      p.status === 'PENDING' &&
      p.paymentMonths?.some((pm) => pm.year === currentYear && pm.month === currentMonth)
  );

  const currentMonthStatus = hasApprovedPayment ? 'APPROVED' : hasPendingPayment ? 'PENDING' : 'UNPAID';
  const currentMonthLabel = formatPaymentMonth({ year: currentYear, month: currentMonth });

  const statusConfig = {
    APPROVED: {
      icon: CheckCircle,
      label: 'Lunas',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      badge: '✓ Paid',
      badgeColor: 'bg-emerald-50 text-emerald-600',
    },
    PENDING: {
      icon: AlertCircle,
      label: 'Menunggu',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      badge: 'Pending',
      badgeColor: 'bg-amber-50 text-amber-600',
    },
    UNPAID: {
      icon: AlertCircle,
      label: 'Belum Bayar',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      badge: 'Pending',
      badgeColor: 'bg-amber-50 text-amber-600',
    },
  };

  const currentStatus = statusConfig[currentMonthStatus];

  // Calculate totals for financial summary
  const totalIncome = financialData.reduce((sum, d) => sum + d.income, 0);
  const totalExpense = financialData.reduce((sum, d) => sum + d.expense, 0);

  if (isLoading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
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
      {/* Greeting */}
      <motion.div variants={itemVariants}>
        <p className="text-sm text-slate-500">{getGreeting()} 👋</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">{user?.name}</h1>
      </motion.div>

      {/* House Info Card */}
      {house ? (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <HomeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Info Rumah</p>
              <div className="flex items-center gap-4 mt-1">
                <div>
                  <p className="text-[11px] text-slate-400">Tipe Rumah</p>
                  <p className="text-sm font-semibold text-slate-800">{house.houseType?.typeName}</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <p className="text-[11px] text-slate-400">No. Rumah</p>
                  <p className="text-sm font-semibold text-slate-800">{house.houseNumber}</p>
                </div>
                <div className="w-px h-8 bg-slate-100" />
                <div>
                  <p className="text-[11px] text-slate-400">Blok</p>
                  <p className="text-sm font-semibold text-slate-800">{house.block}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl p-8 text-center">
          <p className="text-slate-500">Tidak ada rumah yang ditetapkan</p>
        </motion.div>
      )}

      {/* Payment Status */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${currentStatus.bgColor}`}>
              <currentStatus.icon className={`w-5 h-5 ${currentStatus.color}`} />
            </div>
            <div>
              <p className="text-xs text-slate-400">Status IPL {currentMonthLabel}</p>
              <p className={`text-sm font-semibold mt-0.5 ${currentStatus.color}`}>{currentStatus.label}</p>
            </div>
          </div>
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${currentStatus.badgeColor}`}>
            {currentStatus.badge}
          </span>
        </div>
      </motion.div>

      {/* Financial Summary */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ringkasan Keuangan</p>
          <Link
            href="/user/finance"
            className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
          >
            Detail
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[11px] text-slate-400">Pemasukan</span>
            </div>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="flex-1 bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[11px] text-slate-400">Pengeluaran</span>
            </div>
            <p className="text-sm font-bold text-slate-800">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        <FinancialChart data={financialData} />

        <div className="flex items-center justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-slate-400">Pemasukan</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-200" />
            <span className="text-[10px] text-slate-400">Pengeluaran</span>
          </div>
        </div>
      </motion.div>

      {/* Upload Button */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => router.push('/user/upload')}
          className="w-full bg-blue-600 text-white rounded-2xl p-4 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[0.98] transition-transform duration-150"
        >
          <UploadIcon className="w-4.5 h-4.5" />
          Upload Bukti Bayar IPL
        </button>
      </motion.div>

      {/* Recent Payments */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Riwayat Pembayaran</p>
          <button
            onClick={() => router.push('/user/payments')}
            className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
          >
            Semua
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-0">
          {payments.slice(0, 4).map((payment, index) => {
            const statusConf = {
              APPROVED: { label: 'Lunas', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              PENDING: { label: 'Menunggu', color: 'text-amber-600', bg: 'bg-amber-50' },
              REJECTED: { label: 'Ditolak', color: 'text-red-600', bg: 'bg-red-50' },
            }[payment.status];

            const monthLabel = payment.paymentMonths?.[0]
              ? formatPaymentMonth(payment.paymentMonths[0])
              : '-';

            return (
              <div key={payment.id}>
                <div className="flex items-center justify-between py-3">
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
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(Number(payment.totalAmount))}</p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${statusConf.bg} ${statusConf.color}`}>
                      {statusConf.label}
                    </span>
                  </div>
                </div>
                {index < Math.min(payments.length, 4) - 1 && <div className="border-b border-slate-50" />}
              </div>
            );
          })}
          {payments.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Belum ada pembayaran</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
