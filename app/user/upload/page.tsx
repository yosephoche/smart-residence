'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  CheckCircle,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-client';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

interface House {
  id: string;
  houseNumber: string;
  block: string;
  houseType?: {
    typeName: string;
    price: number;
  };
}

interface AvailableMonth {
  label: string;
  value: { year: number; month: number };
}

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
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
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.46, 0.45, 0.94] as any,
    },
  },
};

export default function UploadScreen() {
  const { user } = useAuth();
  const [house, setHouse] = useState<House | null>(null);
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<AvailableMonth | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        const [houseRes, monthsRes, bankRes] = await Promise.all([
          fetch(`/api/houses?userId=${user.id}`),
          fetch('/api/payments/available-months'),
          fetch('/api/system-config/bank-details'),
        ]);

        const [houseData, monthsData, bankData] = await Promise.all([
          houseRes.json(),
          monthsRes.json(),
          bankRes.json(),
        ]);

        setHouse(houseData[0] || null);
        setAvailableMonths(monthsData);
        setBankDetails(bankData);

        // Auto-select first available month
        if (monthsData.length > 0) {
          setSelectedMonth(monthsData[0]);
        }
      } catch (error) {
        console.error('Error fetching upload data:', error);
        toast.error('Gagal memuat data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Hanya file gambar yang diizinkan');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 5MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedMonth || !house) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('amountMonths', '1');
      formData.append('startMonth', String(selectedMonth.value.month));
      formData.append('startYear', String(selectedMonth.value.year));

      const response = await fetch('/api/payments', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success('Bukti bayar berhasil diupload!');

        setTimeout(() => {
          setIsSubmitted(false);
          setSelectedFile(null);
          // Refresh available months
          fetch('/api/payments/available-months')
            .then((r) => r.json())
            .then((data) => {
              setAvailableMonths(data);
              if (data.length > 0) {
                setSelectedMonth(data[0]);
              }
            });
        }, 3000);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Gagal mengupload bukti bayar');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast.error('Terjadi kesalahan saat mengupload');
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (!house) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-slate-500">Anda belum memiliki rumah yang ditetapkan</p>
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
        <h1 className="text-xl font-bold text-slate-900">Upload Bukti Bayar</h1>
        <p className="text-sm text-slate-400 mt-0.5">Upload bukti pembayaran IPL bulanan Anda</p>
      </motion.div>

      {/* Month Selector */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Periode Pembayaran</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableMonths.slice(0, 4).map((month) => (
            <button
              key={month.label}
              onClick={() => setSelectedMonth(month)}
              className={`text-xs font-medium px-3 py-2 rounded-lg transition-colors duration-200 ${
                selectedMonth?.label === month.label
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {month.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Payment Info */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Info Pembayaran</p>
        </div>
        <div className="space-y-2.5">
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Tagihan IPL</span>
            <span className="text-sm font-semibold text-slate-800">
              {house.houseType ? formatCurrency(Number(house.houseType.price)) : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Periode</span>
            <span className="text-sm font-medium text-slate-700">{selectedMonth?.label || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Rekening Tujuan</span>
            <span className="text-sm font-medium text-slate-700">
              {bankDetails?.bankName} {bankDetails?.accountNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Atas Nama</span>
            <span className="text-sm font-medium text-slate-700">{bankDetails?.accountName}</span>
          </div>
        </div>
      </motion.div>

      {/* Upload Area */}
      <motion.div variants={itemVariants}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.button
              key="upload-area"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleFileSelect}
              className="w-full bg-white border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center gap-3 active:border-blue-400 transition-colors"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <UploadCloud className="w-7 h-7 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">Tap untuk upload bukti bayar</p>
                <p className="text-xs text-slate-400 mt-1">JPG, PNG • Maks 5MB</p>
              </div>
            </motion.button>
          ) : (
            <motion.div
              key="file-preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full bg-white border border-slate-100 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Siap diupload</p>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 hover:bg-slate-100"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Submit Button */}
      <motion.div variants={itemVariants}>
        <AnimatePresence mode="wait">
          {isSubmitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full bg-emerald-500 text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-sm"
            >
              <CheckCircle className="w-5 h-5" />
              Bukti Bayar Berhasil Diupload!
            </motion.div>
          ) : (
            <motion.button
              key="submit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleSubmit}
              disabled={!selectedFile || isSubmitting}
              className={`w-full rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
                selectedFile && !isSubmitting
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              <UploadCloud className="w-4.5 h-4.5" />
              {isSubmitting ? 'Mengirim...' : 'Kirim Bukti Bayar'}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
