"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Briefcase,
  LogOut,
  ChevronRight,
  Key,
  Loader2,
  X,
} from "lucide-react";

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
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
} as const;

const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, label, subtitle, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 text-left hover:bg-slate-50 transition-colors active:scale-[0.99] transition-transform duration-150"
    >
      <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </button>
  );
};

export default function StaffProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [isPhoneLoading, setIsPhoneLoading] = useState(true);
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneSaveError, setPhoneSaveError] = useState("");
  const [showPhoneSuccess, setShowPhoneSuccess] = useState(false);

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getJobTypeLabel = (jobType: string | undefined) => {
    if (!jobType) return "Staff";
    const labels: Record<string, string> = {
      SECURITY: "Keamanan",
      CLEANING: "Kebersihan",
      GARDENING: "Taman",
      MAINTENANCE: "Pemeliharaan",
      OTHER: "Lainnya",
    };
    return labels[jobType] || jobType;
  };

  // Fetch current user data to get phone (session doesn't carry it)
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        setPhone(data.phone ?? null);
      })
      .catch(() => setPhone(null))
      .finally(() => setIsPhoneLoading(false));
  }, [session?.user?.id]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
    }
  };

  const handleOpenPhoneEdit = () => {
    setPhoneInput(phone ?? "");
    setPhoneSaveError("");
    setShowPhoneEdit(true);
  };

  const handleSavePhone = async () => {
    setPhoneSaveError("");
    setIsSavingPhone(true);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput.trim() || null }),
      });

      if (!res.ok) {
        const err = await res.json();
        setPhoneSaveError(err.error || "Gagal menyimpan nomor HP");
        return;
      }

      setPhone(phoneInput.trim() || null);
      setShowPhoneEdit(false);
      setShowPhoneSuccess(true);
      setTimeout(() => setShowPhoneSuccess(false), 2500);
    } catch {
      setPhoneSaveError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setIsSavingPhone(false);
    }
  };

  if (!session?.user) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const user = session.user;

  return (
    <>
      <motion.div
        className="px-4 pt-2 pb-4 space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Profile Header */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] flex items-center gap-4"
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <span className="text-lg font-bold text-blue-600">
              {getInitials(user.name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">
              {user.name}
            </h2>
            <p className="text-sm text-slate-400 truncate">{user.email}</p>
          </div>
        </motion.div>

        {/* Success Toast */}
        <AnimatePresence>
          {showPhoneSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 flex items-center gap-2"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-emerald-700">Nomor HP berhasil disimpan</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Info Card */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              Informasi Akun
            </h3>
          </div>

          {/* Name */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 mb-0.5">Nama Lengkap</p>
              <p className="text-sm font-medium text-slate-800 truncate">
                {user.name}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 mb-0.5">Email</p>
              <p className="text-sm font-medium text-slate-800 truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <Phone className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 mb-0.5">Nomor HP</p>
              {isPhoneLoading ? (
                <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
              ) : (
                <p className={`text-sm font-medium truncate ${phone ? "text-slate-800" : "text-slate-400"}`}>
                  {phone || "Belum diisi"}
                </p>
              )}
            </div>
          </div>

          {/* Job Type */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 mb-0.5">Jenis Pekerjaan</p>
              <p className="text-sm font-medium text-slate-800">
                {getJobTypeLabel(user.staffJobType)}
              </p>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <Shield className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400 mb-0.5">Role</p>
              <p className="text-sm font-medium text-slate-800">{user.role}</p>
            </div>
          </div>
        </motion.div>

        {/* Actions Card */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Pengaturan</h3>
          </div>

          <MenuItem
            icon={<Key className="w-4 h-4" />}
            label="Ganti Password"
            subtitle="Ubah password akun Anda"
            onClick={() => router.push("/change-password")}
          />

          <MenuItem
            icon={<Phone className="w-4 h-4" />}
            label="Edit Nomor HP"
            subtitle="Perbarui nomor WhatsApp Anda"
            onClick={handleOpenPhoneEdit}
          />
        </motion.div>

        {/* Logout Button */}
        <motion.div variants={itemVariants}>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full bg-red-600 text-white rounded-2xl p-4 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[0.98] transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="w-4.5 h-4.5" />
                Logout
              </>
            )}
          </button>
        </motion.div>
      </motion.div>

      {/* Phone Edit Bottom Sheet */}
      <AnimatePresence>
        {showPhoneEdit && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowPhoneEdit(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl z-50 px-5 pt-5 pb-8 shadow-xl"
            >
              {/* Handle */}
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Nomor HP</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Digunakan untuk tombol WhatsApp</p>
                </div>
                <button
                  onClick={() => setShowPhoneEdit(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Input */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">Nomor HP / WhatsApp</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="Contoh: 08123456789"
                  className="w-full px-4 py-3 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                  maxLength={20}
                />
                {phoneSaveError && (
                  <p className="text-xs text-red-600 mt-1.5">{phoneSaveError}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPhoneEdit(false)}
                  className="flex-1 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 active:scale-[0.98] transition-transform duration-150"
                >
                  Batal
                </button>
                <button
                  onClick={handleSavePhone}
                  disabled={isSavingPhone}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSavingPhone ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan"
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
