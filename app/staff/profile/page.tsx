"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  User as UserIcon,
  Mail,
  Shield,
  Briefcase,
  LogOut,
  ChevronRight,
  Key,
  Loader2,
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

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut({ callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
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
  );
}
