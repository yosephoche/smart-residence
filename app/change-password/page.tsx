"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/lib/auth-client";
import {
  changePasswordSchema,
  ChangePasswordFormData,
} from "@/lib/validations/auth.schema";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";
import AuthGuard from "@/components/layouts/AuthGuard";
import { useTranslations } from "next-intl";

export const dynamic = 'force-dynamic';

function ChangePasswordContent() {
  const router = useRouter();
  const { user, changePassword, logout } = useAuth();
  const [error, setError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError("");
    setIsSubmitting(true);

    const result = await changePassword(data.oldPassword, data.newPassword);

    if (result.success) {
      router.refresh();
    } else {
      setError(result.error || "Failed to change password");
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warning-50 via-white to-warning-100 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-warning-500 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {t('change_password_required')}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {t('change_password_message')}
            </p>
          </div>

          {/* Warning Notice */}
          <div className="mb-6">
            <Alert
              variant="warning"
              title={t('first_time_login')}
              message={t('must_change_password')}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6">
              <Alert variant="error" message={error} />
            </div>
          )}

          {/* Change Password Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t('current_password')}
              type="password"
              placeholder={t('current_password_placeholder')}
              error={errors.oldPassword?.message}
              {...register("oldPassword")}
              fullWidth
              required
              autoComplete="current-password"
            />

            <Input
              label={t('new_password')}
              type="password"
              placeholder={t('new_password_placeholder')}
              error={errors.newPassword?.message}
              helperText={t('password_hint')}
              {...register("newPassword")}
              fullWidth
              required
              autoComplete="new-password"
            />

            <Input
              label={t('confirm_password')}
              type="password"
              placeholder={t('confirm_password_placeholder')}
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
              fullWidth
              required
              autoComplete="new-password"
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="lg"
                fullWidth
                onClick={handleLogout}
                disabled={isSubmitting}
              >
                {tCommon('actions.cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmitting}
              >
                {t('change_password')}
              </Button>
            </div>
          </form>

          {/* Password Requirements */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">
              {t('password_requirements')}
            </p>
            <ul className="space-y-1 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{t('requirement_min_length')}</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{t('requirement_mixed_case')}</span>
              </li>
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 text-success-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{t('requirement_different')}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <AuthGuard>
      <ChangePasswordContent />
    </AuthGuard>
  );
}
