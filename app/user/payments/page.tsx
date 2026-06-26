'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, CheckCircle, Clock, XCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { formatPaymentMonth } from '@/lib/calculations';
import { toast } from 'sonner';
import Image from 'next/image';

interface Payment {
  id: string;
  amountMonths: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  proofImagePath: string | null;
  rejectionNote?: string | null;
  paymentMonths?: Array<{ year: number; month: number }>;
  house?: { houseNumber: string; block?: string; houseType?: { typeName: string } };
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const as any } },
} as const;

const statusConfig = {
  APPROVED: { label: 'Lunas', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle, iconColor: 'text-emerald-500' },
  PENDING:  { label: 'Menunggu', color: 'text-amber-600', bg: 'bg-amber-50',   icon: Clock,       iconColor: 'text-amber-500'   },
  REJECTED: { label: 'Ditolak', color: 'text-red-600',   bg: 'bg-red-50',     icon: XCircle,     iconColor: 'text-red-500'     },
};

export default function PaymentsScreen() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [imageFullscreen, setImageFullscreen] = useState(false);

  useEffect(() => {
    fetch('/api/payments')
      .then((r) => r.json())
      .then((data) => setPayments(data))
      .catch(() => toast.error('Gagal memuat data pembayaran', { duration: 6000 }))
      .finally(() => setIsLoading(false));
  }, []);

  const totalPaid = payments.filter((p) => p.status === 'APPROVED').reduce((sum, p) => sum + Number(p.totalAmount), 0);
  const paidCount = payments.filter((p) => p.status === 'APPROVED').length;
  const currentYear = new Date().getFullYear();

  if (isLoading) {
    return (
      <div className="px-4 pt-2 pb-4 space-y-4 animate-pulse">
        <div className="h-6 bg-slate-200 rounded-lg w-32" />
        <div className="h-28 bg-slate-200 rounded-2xl" />
        <div className="h-64 bg-slate-200 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
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
          <p className="text-xs text-blue-200 font-medium">Total Dibayar ({currentYear})</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(totalPaid)}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full">
              {paidCount} transaksi lunas
            </span>
          </div>
        </motion.div>

        {/* Payment List */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">Belum ada pembayaran</p>
              <p className="text-xs text-slate-400 mt-1">Pembayaran IPL Anda akan muncul di sini</p>
            </div>
          ) : (
            payments.map((payment, index) => {
              const config = statusConfig[payment.status];
              const monthLabel = payment.paymentMonths?.[0]
                ? formatPaymentMonth(payment.paymentMonths[0])
                : '-';
              const multiMonth = (payment.paymentMonths?.length ?? 0) > 1;

              return (
                <motion.button
                  key={payment.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.04, duration: 0.3 }}
                  onClick={() => setSelectedPayment(payment)}
                  className="w-full flex items-center justify-between px-4 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        IPL {monthLabel}
                        {multiMonth && (
                          <span className="ml-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                            +{(payment.paymentMonths?.length ?? 1) - 1}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{formatDate(payment.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatCurrency(Number(payment.totalAmount))}
                    </p>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                </motion.button>
              );
            })
          )}
        </motion.div>
      </motion.div>

      {/* Bottom Sheet Detail */}
      <AnimatePresence>
        {selectedPayment && (() => {
          const payment = selectedPayment;
          const config = statusConfig[payment.status];
          const StatusIcon = config.icon;

          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setSelectedPayment(null)}
              />

              {/* Sheet */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-2xl z-50"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>

                {/* Close button */}
                <button
                  onClick={() => setSelectedPayment(null)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                </button>

                <div className="px-5 pb-2 space-y-4 max-h-[80vh] overflow-y-auto">
                  {/* Title + Status */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Detail Pembayaran</h2>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(payment.createdAt)}</p>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${config.bg} ${config.color}`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${config.iconColor}`} />
                      {config.label}
                    </span>
                  </div>

                  {/* Details grid */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    {payment.paymentMonths && payment.paymentMonths.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-400">Bulan IPL</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {payment.paymentMonths.map((m) => formatPaymentMonth(m)).join(', ')}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">Jumlah Bulan</span>
                      <span className="text-xs font-semibold text-slate-700">{payment.amountMonths} bulan</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-3">
                      <span className="text-xs font-semibold text-slate-600">Total</span>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(Number(payment.totalAmount))}</span>
                    </div>
                    {payment.house && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-400">Rumah</span>
                        <span className="text-xs font-semibold text-slate-700">
                          {payment.house.block && `Blok ${payment.house.block} `}No. {payment.house.houseNumber}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Rejection reason */}
                  {payment.status === 'REJECTED' && payment.rejectionNote && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                      <p className="text-xs font-semibold text-red-600 mb-1">Alasan Penolakan</p>
                      <p className="text-xs text-red-500">{payment.rejectionNote}</p>
                    </div>
                  )}

                  {/* Proof image */}
                  {payment.proofImagePath && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Bukti Transfer</p>
                      <button
                        onClick={() => setImageFullscreen(true)}
                        className="w-full rounded-xl overflow-hidden border border-slate-200 block"
                      >
                        <div className="relative w-full h-48">
                          <Image
                            src={payment.proofImagePath}
                            alt="Bukti transfer"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 hover:opacity-100 text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full transition-opacity">
                              Tap untuk perbesar
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {!payment.proofImagePath && (
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <p className="text-xs text-slate-400">Tidak ada bukti transfer</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Fullscreen image overlay */}
              <AnimatePresence>
                {imageFullscreen && payment.proofImagePath && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black z-[60] flex items-center justify-center"
                    onClick={() => setImageFullscreen(false)}
                  >
                    <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="relative w-full h-full max-w-lg mx-auto">
                      <Image
                        src={payment.proofImagePath}
                        alt="Bukti transfer"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          );
        })()}
      </AnimatePresence>
    </>
  );
}
