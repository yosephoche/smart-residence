"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Loading, { Skeleton } from "@/components/ui/Loading";
import UserForm from "@/components/forms/UserForm";
import { UserFormData } from "@/lib/validations/user.schema";
import { User } from "@/types";

export const dynamic = 'force-dynamic';

export default function EditUserPage() {
  const t = useTranslations('users');
  const tForm = useTranslations('users.form');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
      setIsLoading(false);
    };

    loadUser();
  }, [userId]);

  const handleSubmit = async (data: UserFormData) => {
    if (!user) return;

    setError("");
    setIsSubmitting(true);

    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: data.name, role: data.role, phone: data.phone || null }),
    });

    if (!res.ok) {
      const err = await res.json();
      setError(err.error || "Failed to update user");
      setIsSubmitting(false);
      return;
    }

    router.push("/admin/users");
  };

  const handleCancel = () => {
    router.push("/admin/users");
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72 mt-2" />
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6 space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Alert
          variant="error"
          title={t('no_users_found')}
          message={t('no_users_found')}
        />
        <button
          onClick={() => router.push("/admin/users")}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← {tCommon('actions.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.push("/admin/users")}
          className="text-gray-600 hover:text-gray-900 font-medium mb-4 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {tCommon('actions.back')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {tForm('update_user')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('subtitle')}
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="error" message={error} onClose={() => setError("")} />
      )}

      {/* Form Card */}
      <Card>
        <UserForm
          user={user!}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  );
}
