"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  Image as ImageIcon,
  X,
  CheckCircle,
  Calendar,
  CreditCard,
  CalendarRange,
  Minus,
  Plus,
  CheckCircle2,
  AlertCircle,
  QrCode,
  ChevronRight,
  Home as HomeIcon,
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-client";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { computeCoveredMonths, formatPaymentMonth } from "@/lib/calculations";

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

export default function UploadScreen() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState<string | null>(null);
  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<AvailableMonth | null>(
    null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showQris, setShowQris] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountMonths, setAmountMonths] = useState(1);
  const [occupiedMonths, setOccupiedMonths] = useState<
    Array<{ year: number; month: number }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived from selectedHouseId
  const house = houses.find((h) => h.id === selectedHouseId) ?? null;

  // Derive pendingPayment reactively based on selected house
  const pendingPayment = useMemo(() => {
    if (!selectedHouseId) return null;
    return (
      allPayments.find(
        (p: any) => p.houseId === selectedHouseId && p.status === "PENDING",
      ) ?? null
    );
  }, [allPayments, selectedHouseId]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      try {
        const [houseRes, monthsRes, bankRes, paymentsRes] = await Promise.all([
          fetch(`/api/houses?userId=${user.id}`),
          fetch("/api/payments/available-months"),
          fetch("/api/system-config/bank-details"),
          fetch("/api/payments"),
        ]);

        const [houseData, monthsData, bankData, paymentsData] =
          await Promise.all([
            houseRes.json(),
            monthsRes.json(),
            bankRes.json(),
            paymentsRes.json(),
          ]);

        const allPays = Array.isArray(paymentsData) ? paymentsData : [];
        setAllPayments(allPays);

        const records: House[] = Array.isArray(houseData) ? houseData : [];
        setHouses(records);
        if (records.length === 1) setSelectedHouseId(records[0].id);
        setAvailableMonths(monthsData);
        setBankDetails(bankData);

        // Auto-select first available month
        if (monthsData.length > 0) {
          setSelectedMonth(monthsData[0]);
        }
      } catch (error) {
        console.error("Error fetching upload data:", error);
        toast.error("Gagal memuat data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  // Fetch occupied months whenever the selected house changes
  useEffect(() => {
    if (!selectedHouseId) {
      setOccupiedMonths([]);
      return;
    }
    fetch(`/api/payments/occupied-months?houseId=${selectedHouseId}`)
      .then((r) => r.json())
      .then(setOccupiedMonths)
      .catch((err) => console.error("Error fetching occupied months:", err));
  }, [selectedHouseId]);

  // Compute covered months based on selected month and amount
  const coveredMonths = useMemo(() => {
    if (!selectedMonth) return [];
    return computeCoveredMonths(
      { year: selectedMonth.value.year, month: selectedMonth.value.month },
      amountMonths,
    );
  }, [selectedMonth, amountMonths]);

  // Check for conflicts with occupied months
  const hasOverlap = useMemo(() => {
    if (coveredMonths.length === 0) return false;
    return coveredMonths.some((cm) =>
      occupiedMonths.some((om) => om.year === cm.year && om.month === cm.month),
    );
  }, [coveredMonths, occupiedMonths]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Hanya file gambar yang diizinkan");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file maksimal 5MB");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !selectedMonth || !house || hasOverlap) return;

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("proofImage", selectedFile);
      formData.append("amountMonths", String(amountMonths));
      formData.append("houseId", house.id);

      const response = await fetch("/api/payments", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setIsSubmitted(true);
        toast.success("Bukti bayar berhasil diupload!");

        setTimeout(() => {
          setIsSubmitted(false);
          setSelectedFile(null);
          setAmountMonths(1);
          // Refresh available months and occupied months
          Promise.all([
            fetch("/api/payments/available-months").then((r) => r.json()),
            fetch(`/api/payments/occupied-months?houseId=${house.id}`).then(
              (r) => r.json(),
            ),
          ]).then(([monthsData, occupiedData]) => {
            setAvailableMonths(monthsData);
            setOccupiedMonths(occupiedData);
            if (monthsData.length > 0) {
              setSelectedMonth(monthsData[0]);
            }
          });
        }, 3000);
      } else {
        const error = await response.json();
        toast.error(error.error || "Gagal mengupload bukti bayar");
      }
    } catch (error) {
      console.error("Error submitting payment:", error);
      toast.error("Terjadi kesalahan saat mengupload");
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

  if (houses.length === 0) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="bg-white rounded-2xl p-8 text-center">
          <p className="text-slate-500">
            Anda belum memiliki rumah yang ditetapkan
          </p>
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
        <p className="text-sm text-slate-400 mt-0.5">
          Upload bukti pembayaran IPL bulanan Anda
        </p>
      </motion.div>

      {/* House Selector — shown when user has multiple houses and none selected */}
      {houses.length > 1 && !selectedHouseId && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
        >
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            Pilih Rumah
          </p>
          {houses.map((h) => (
            <button
              key={h.id}
              onClick={() => setSelectedHouseId(h.id)}
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-blue-200 mb-2 last:mb-0 active:scale-[0.98] transition-all duration-150"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <HomeIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-800">
                    Rumah {h.houseNumber}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Blok {h.block} · {h.houseType?.typeName}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </motion.div>
      )}

      {/* Ganti Rumah back button */}
      {houses.length > 1 && selectedHouseId && (
        <motion.div variants={itemVariants}>
          <button
            onClick={() => {
              setSelectedHouseId(null);
              setSelectedFile(null);
              setAmountMonths(1);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white rounded-lg px-3 py-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] active:scale-[0.98]"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            Ganti Rumah
          </button>
        </motion.div>
      )}

      {selectedHouseId && (<>
      {/* Pending Payment Blocker */}
      <AnimatePresence>
        {pendingPayment && (
          <motion.div
            key="pending-blocker"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            variants={itemVariants}
          >
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  Ada Pembayaran yang Sedang Diproses
                </p>
                <p className="text-xs text-amber-600 mt-1 leading-relaxed">
                  Anda masih memiliki bukti bayar yang menunggu verifikasi
                  admin. Silakan tunggu hingga pembayaran sebelumnya disetujui
                  atau ditolak sebelum mengirim bukti baru.
                </p>
                {pendingPayment.paymentMonths?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {pendingPayment.paymentMonths.map((m: { year: number; month: number }) => (
                      <span
                        key={`${m.year}-${m.month}`}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
                      >
                        {formatPaymentMonth(m)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Month Amount Stepper */}
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-2 mb-3">
            <CalendarRange className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Jumlah Bulan
            </p>
          </div>

          {/* Month stepper */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setAmountMonths(Math.max(1, amountMonths - 1))}
              disabled={amountMonths === 1 || !!pendingPayment}
              className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
            >
              <Minus className="w-4 h-4 text-slate-600" />
            </button>

            <div className="text-center">
              <p className="text-2xl font-bold text-slate-800">
                {amountMonths}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">bulan</p>
            </div>

            <button
              onClick={() => setAmountMonths(Math.min(12, amountMonths + 1))}
              disabled={amountMonths === 12 || !!pendingPayment}
              className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-blue-600" />
            </button>
          </div>

          {/* Total preview */}
          <div className="mt-3 pt-3 border-t border-slate-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Total Pembayaran</span>
              <span className="text-sm font-bold text-blue-600">
                {house?.houseType
                  ? formatCurrency(Number(house.houseType.price) * amountMonths)
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Month Selector */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Bulan Mulai
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableMonths.slice(0, 4).map((month) => (
            <button
              key={month.label}
              onClick={() => !pendingPayment && setSelectedMonth(month)}
              disabled={!!pendingPayment}
              className={`text-xs font-medium px-3 py-2 rounded-lg transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed ${
                selectedMonth?.label === month.label
                  ? "bg-blue-600 text-white"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {month.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Covered Months Preview */}
      {coveredMonths.length > 0 && (
        <motion.div variants={itemVariants}>
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                Bulan yang Dibayar
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {coveredMonths.map((m) => {
                const isOccupied = occupiedMonths.some(
                  (om) => om.year === m.year && om.month === m.month,
                );
                return (
                  <span
                    key={`${m.year}-${m.month}`}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                      isOccupied
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {formatPaymentMonth(m)}
                  </span>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Overlap Warning */}
      {hasOverlap && (
        <motion.div variants={itemVariants}>
          <div className="bg-red-50 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Tumpang Tindih Bulan
              </p>
              <p className="text-xs text-red-600 mt-1">
                Beberapa bulan yang dipilih sudah memiliki pembayaran pending
                atau disetujui. Silakan pilih jumlah bulan yang berbeda atau
                bulan awal yang berbeda.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment Info */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Info Pembayaran
          </p>
        </div>
        <div className="space-y-2.5">
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Tagihan IPL/Bulan</span>
            <span className="text-sm font-medium text-slate-700">
              {house?.houseType
                ? formatCurrency(Number(house.houseType.price))
                : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Jumlah Bulan</span>
            <span className="text-sm font-medium text-slate-700">
              {amountMonths} bulan
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <span className="text-sm font-medium text-slate-700">
              Total Bayar
            </span>
            <span className="text-base font-bold text-blue-600">
              {house?.houseType
                ? formatCurrency(Number(house.houseType.price) * amountMonths)
                : "-"}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100">
            <span className="text-sm text-slate-500">Rekening Tujuan</span>
            <span className="text-sm font-medium text-slate-700">
              {bankDetails?.bankName} {bankDetails?.accountNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-500">Atas Nama</span>
            <span className="text-sm font-medium text-slate-700">
              {bankDetails?.accountName}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Show QRIS Button */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => setShowQris(true)}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 border-blue-200 bg-blue-50 text-blue-700 font-semibold text-sm hover:bg-blue-100 active:scale-[0.98] transition-all duration-150"
        >
          <QrCode className="w-5 h-5" />
          Lihat QRIS
        </button>
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
              onClick={pendingPayment ? undefined : handleFileSelect}
              disabled={!!pendingPayment}
              className={`w-full bg-white border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors ${
                pendingPayment
                  ? "border-slate-100 opacity-40 cursor-not-allowed"
                  : "border-slate-200 active:border-blue-400"
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                <UploadCloud className="w-7 h-7 text-blue-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Tap untuk upload bukti bayar
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  JPG, PNG • Maks 5MB
                </p>
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
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {selectedFile.name}
                  </p>
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
              className="bg-emerald-500 text-white rounded-2xl p-6 flex flex-col items-center justify-center gap-3"
            >
              <CheckCircle2 className="w-12 h-12" />
              <div className="text-center">
                <p className="font-bold text-lg">
                  Bukti Transfer Berhasil Dikirim!
                </p>
                <p className="text-sm text-emerald-50 mt-1">
                  Pembayaran untuk {amountMonths} bulan sedang diproses
                </p>
                {coveredMonths.length > 0 && (
                  <p className="text-xs text-emerald-100 mt-2">
                    {coveredMonths.map((m) => formatPaymentMonth(m)).join(", ")}
                  </p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="submit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleSubmit}
              disabled={
                !selectedFile || isSubmitting || hasOverlap || !!pendingPayment
              }
              className={`w-full rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-sm transition-all duration-200 active:scale-[0.98] ${
                selectedFile && !isSubmitting && !hasOverlap && !pendingPayment
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              }`}
            >
              <UploadCloud className="w-4.5 h-4.5" />
              {isSubmitting
                ? "Mengirim..."
                : pendingPayment
                  ? "Menunggu Verifikasi..."
                  : "Kirim Bukti Bayar"}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
      </>)}

      {/* QRIS Modal */}
      <AnimatePresence>
        {showQris && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowQris(false)}
            />

            {/* Modal card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="font-bold text-slate-900 text-base">
                    Pembayaran QRIS
                  </p>
                </div>
                <button
                  onClick={() => setShowQris(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors text-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QRIS Image */}
              <div className="px-4 pb-2">
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden">
                  <Image
                    src="/images/qris.jpeg"
                    alt="QRIS Sakura Village"
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>

              {/* Footer hint */}
              <p className="text-xs text-center text-slate-400 px-4 pb-2">
                Scan menggunakan aplikasi dompet digital / mobile banking
              </p>

              {/* Close button */}
              <div className="px-4 pb-5">
                <button
                  onClick={() => setShowQris(false)}
                  className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-semibold text-sm active:scale-[0.98] transition-transform duration-150"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
