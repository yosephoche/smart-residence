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
  Wallet,
  Shield,
  User as UserIcon,
  Phone,
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

interface OnDutyStaff {
  id: string;
  clockInAt: string;
  staff: {
    id: string;
    name: string;
    staffJobType: string | null;
    phone: string | null;
  };
}

interface UrgentContact {
  id: string;
  name: string;
  serviceType: string;
  phone: string;
  order: number;
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
  const [onDutyStaff, setOnDutyStaff] = useState<OnDutyStaff[]>([]);
  const [urgentContacts, setUrgentContacts] = useState<UrgentContact[]>([]);
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    "Halo, saya warga Sakura Village blok {block} no {number}, saya ingin minta bantuannya"
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      const [housesResult, paymentsResult, financialResult, onDutyResult, urgentContactsResult, waTemplateResult] =
        await Promise.allSettled([
          fetch(`/api/houses?userId=${user.id}`).then(r => r.json()),
          fetch('/api/payments').then(r => r.json()),
          fetch('/api/user/financial-summary').then(r => r.json()),
          fetch('/api/attendance/on-duty').then(r => r.json()),
          fetch('/api/urgent-contacts').then(r => r.json()),
          fetch('/api/system-config/whatsapp-template').then(r => r.json()),
        ]);

      if (housesResult.status === 'fulfilled') setHouse(housesResult.value[0] || null);
      if (paymentsResult.status === 'fulfilled') setPayments(paymentsResult.value);
      if (financialResult.status === 'fulfilled') setFinancialData(financialResult.value);
      if (onDutyResult.status === 'fulfilled' && Array.isArray(onDutyResult.value)) {
        setOnDutyStaff(onDutyResult.value);
      }
      if (urgentContactsResult.status === 'fulfilled' && Array.isArray(urgentContactsResult.value)) {
        setUrgentContacts(urgentContactsResult.value);
      }
      if (waTemplateResult.status === 'fulfilled' && waTemplateResult.value?.template) {
        setWhatsappTemplate(waTemplateResult.value.template);
      }

      setIsLoading(false);
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

  // Build a WhatsApp URL with the configurable message template
  const buildWhatsAppUrl = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = whatsappTemplate
      .replace('{block}', house?.block ?? '')
      .replace('{number}', house?.houseNumber ?? '');
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded-2xl" />
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-24 bg-gray-200 rounded-2xl" />
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

      {/* On-Duty Security Staff */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Petugas Keamanan Bertugas
          </p>
          {onDutyStaff.length > 0 && (
            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">
              {onDutyStaff.length} aktif
            </span>
          )}
        </div>

        {onDutyStaff.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-2">
            Tidak ada petugas yang bertugas saat ini
          </p>
        ) : (
          <div className="space-y-0">
            {onDutyStaff.map((item, index) => {
              const clockInTime = new Date(item.clockInAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              });
              return (
                <div key={item.id}>
                  <div className="flex items-center gap-3 py-3">
                    <div className="relative w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.staff.name}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">Bertugas sejak {clockInTime}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 flex-shrink-0">
                      Keamanan
                    </span>
                    {item.staff.phone ? (
                      <a
                        href={buildWhatsAppUrl(item.staff.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors"
                        title="Chat via WhatsApp"
                      >
                        <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </a>
                    ) : (
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center opacity-40 cursor-not-allowed"
                        title="Nomor WhatsApp tidak tersedia"
                      >
                        <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  {index < onDutyStaff.length - 1 && <div className="border-b border-slate-50" />}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Urgent Contacts */}
      {urgentContacts.length > 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
        >
          <div className="flex items-center gap-2 mb-3">
            <Phone className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Kontak Darurat
            </p>
            <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-50 text-red-600">
              {urgentContacts.length} kontak
            </span>
          </div>
          <div className="space-y-0">
            {urgentContacts.map((contact, index) => (
              <div key={contact.id}>
                <div className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{contact.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{contact.serviceType}</p>
                  </div>
                  <a
                    href={buildWhatsAppUrl(contact.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center hover:bg-green-100 transition-colors"
                    title={`Chat ${contact.name} via WhatsApp`}
                  >
                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </a>
                </div>
                {index < urgentContacts.length - 1 && <div className="border-b border-slate-50" />}
              </div>
            ))}
          </div>
        </motion.div>
      )}

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
