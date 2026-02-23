'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/Modal';
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher';
import { User, Home, Mail, KeyRound, LogOut } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface HouseData {
  houseNumber: string;
  block: string;
  houseType: {
    typeName: string;
  };
}

const SettingsPage = () => {
  const router = useRouter();
  const t = useTranslations('user_settings');
  const [user, setUser] = useState<UserData | null>(null);
  const [house, setHouse] = useState<HouseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Fetch current user session
      const sessionRes = await fetch('/api/auth/session');
      if (!sessionRes.ok) throw new Error('Failed to fetch session');
      const sessionData = await sessionRes.json();
      setUser(sessionData.user);

      // Fetch house data
      const houseRes = await fetch(`/api/houses?userId=${sessionData.user.id}`);
      if (houseRes.ok) {
        const houseData = await houseRes.json();
        setHouse(houseData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error(t('load_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      if (res.ok) {
        router.push('/login');
      } else {
        throw new Error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(t('logout_error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('subtitle')}
        </p>
      </div>

      {/* Profile Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('profile')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('name')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {user?.name || '-'}
                </p>
              </div>
            </div>
          </Card>

          {/* Email Card */}
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-600 dark:text-gray-400">{t('email')}</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.email || '-'}
                </p>
              </div>
            </div>
          </Card>

          {/* House Card */}
          {house && (
            <Card className="p-4 md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                  <Home className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('house')}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {house.houseNumber} - Blok {house.block} ({house.houseType.typeName})
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Preferences Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('preferences')}
        </h2>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('language')}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {t('language_hint')}
              </p>
            </div>
            <LanguageSwitcher />
          </div>
        </Card>
      </div>

      {/* Security Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {t('security')}
        </h2>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('password')}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t('change_password')}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push('/change-password')}
            >
              {t('change')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Logout Section */}
      <div>
        <Card className="p-4 border-red-200 dark:border-red-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('logout_section')}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t('logout_description')}
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowLogoutConfirm(true)}
            >
              {t('logout_section')}
            </Button>
          </div>
        </Card>
      </div>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title={t('logout_section')}
        message={t('logout_confirm')}
        variant="danger"
      />
    </div>
  );
};

export default SettingsPage;
