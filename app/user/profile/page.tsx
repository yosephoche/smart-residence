'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  User as UserIcon,
  Home as HomeIcon,
  MapPin,
  Phone,
  Mail,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-client';
import { toast } from 'sonner';

interface House {
  id: string;
  houseNumber: string;
  block: string;
  houseType?: {
    typeName: string;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  houses: House[];
}

interface ResidenceInfoConfig {
  residenceName: string;
  residenceAddress: string;
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

const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, label, subtitle, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 last:border-0 text-left hover:bg-slate-50 transition-colors"
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

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [residenceInfo, setResidenceInfo] = useState<ResidenceInfoConfig>({
    residenceName: 'Perumahan Melati Indah',
    residenceAddress: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  // Phone editing state
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [profileResponse, residenceResponse] = await Promise.all([
          fetch('/api/users/profile'),
          fetch('/api/system-config/residence-info'),
        ]);
        const profileData = await profileResponse.json();
        setProfile(profileData);
        setPhoneValue(profileData.phone || '');

        if (residenceResponse.ok) {
          const residenceData = await residenceResponse.json();
          setResidenceInfo(residenceData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Gagal memuat profil');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      toast.success('Berhasil logout');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Gagal logout');
    }
  };

  const handleSavePhone = async () => {
    setIsSavingPhone(true);
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneValue }),
      });

      if (response.ok) {
        const updated = await response.json();
        setProfile((prev) => prev ? { ...prev, phone: updated.phone } : prev);
        setIsEditingPhone(false);
        toast.success('Nomor telepon berhasil diperbarui');
      } else {
        const err = await response.json();
        toast.error(err.error || 'Gagal menyimpan nomor telepon');
      }
    } catch (error) {
      console.error('Error saving phone:', error);
      toast.error('Terjadi kesalahan saat menyimpan');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleCancelPhone = () => {
    setPhoneValue(profile?.phone || '');
    setIsEditingPhone(false);
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-48 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  const house = profile?.houses[0];

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
        <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-bold text-blue-600">
            {profile ? getInitials(profile.name) : '??'}
          </span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">{profile?.name}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {house ? `Penghuni Blok ${house.block} ${house.houseNumber}` : 'Belum ada rumah'}
          </p>
          <span className="inline-block mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
            Aktif
          </span>
        </div>
      </motion.div>

      {/* House Details */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Detail Hunian</p>
        <div className="space-y-3">
          {/* Residence Name Row */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <HomeIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-slate-400">Perumahan</p>
              <p className="text-sm font-medium text-slate-700">
                {residenceInfo.residenceName}
                {residenceInfo.residenceAddress ? ` — ${residenceInfo.residenceAddress}` : ''}
              </p>
            </div>
          </div>

          {/* House Block/Number Row */}
          {house && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] text-slate-400">Unit Hunian</p>
                <p className="text-sm font-medium text-slate-700">
                  Blok {house.block} No. {house.houseNumber}
                  {house.houseType ? ` · ${house.houseType.typeName}` : ''}
                </p>
              </div>
            </div>
          )}

          {/* Phone Row with inline editing */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Phone className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-400">No. Telepon</p>
              <AnimatePresence mode="wait">
                {isEditingPhone ? (
                  <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 mt-1"
                  >
                    <input
                      type="tel"
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={handleSavePhone}
                      disabled={isSavingPhone}
                      className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelPhone}
                      disabled={isSavingPhone}
                      className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="display"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2"
                  >
                    <p className="text-sm font-medium text-slate-700">{profile?.phone || '-'}</p>
                    <button
                      onClick={() => setIsEditingPhone(true)}
                      className="w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Email Row */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <Mail className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] text-slate-400">Email</p>
              <p className="text-sm font-medium text-slate-700">{profile?.email}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Menu Items */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] overflow-hidden"
      >
        <MenuItem
          icon={<Bell className="w-4 h-4" />}
          label="Notifikasi"
          subtitle="Kelola pengaturan notifikasi"
          onClick={() => toast.info('Fitur akan segera hadir')}
        />
        <MenuItem
          icon={<Shield className="w-4 h-4" />}
          label="Keamanan"
          subtitle="Ubah password akun"
          onClick={() => router.push('/change-password')}
        />
        <MenuItem
          icon={<HelpCircle className="w-4 h-4" />}
          label="Bantuan"
          subtitle="FAQ & hubungi kami"
          onClick={() => toast.info('Fitur akan segera hadir')}
        />
      </motion.div>

      {/* Logout */}
      <motion.div variants={itemVariants}>
        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-center gap-2 text-red-500 font-semibold text-sm shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform duration-150"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <p className="text-center text-[11px] text-slate-300 mt-2">IPL Manager v1.0.0</p>
      </motion.div>
    </motion.div>
  );
}
