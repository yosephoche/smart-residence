"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth-client";
import PaymentCard from "@/components/payments/PaymentCard";
import { Skeleton } from "@/components/ui/Loading";
import { Payment } from "@/types";

export const dynamic = 'force-dynamic';

interface House {
  id: string;
  houseNumber: string;
}

export default function PaymentHistoryPage() {
  const t = useTranslations('payments.user');
  const tCommon = useTranslations('common');
  const tForm = useTranslations('payments.form');
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [house, setHouse] = useState<House | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const fetchingRef = useRef(false);

  // Memoize user.id to stabilize dependency
  const userId = useMemo(() => user?.id, [user?.id]);

  useEffect(() => {
    if (!userId || fetchingRef.current) return;

    fetchingRef.current = true;
    Promise.all([
      fetch("/api/payments").then((r) => r.json()),
      fetch(`/api/houses?userId=${userId}`).then((r) => r.json()),
    ])
      .then(([paymentsData, housesData]) => {
        setPayments(
          paymentsData.map((p: any) => ({
            ...p,
            totalAmount: Number(p.totalAmount),
          }))
        );
        if (housesData.length > 0) setHouse(housesData[0]);
        setIsLoading(false);
      })
      .catch((err) => console.error("Failed to fetch payment history:", err))
      .finally(() => { fetchingRef.current = false; });
  }, [userId]);

  const filteredPayments = useMemo(() => {
    if (statusFilter === "ALL") return payments;
    return payments.filter((p) => p.status === statusFilter);
  }, [payments, statusFilter]);

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === "PENDING").length,
    approved: payments.filter((p) => p.status === "APPROVED").length,
    rejected: payments.filter((p) => p.status === "REJECTED").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-14" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          {t('history_title')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('history_subtitle')}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('total_payments')}</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-warning-50 rounded-xl border-2 border-warning-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-warning-700 mb-1">{tCommon('status.pending')}</p>
          <p className="text-3xl font-bold text-warning-900">{stats.pending}</p>
        </div>
        <div className="bg-success-50 rounded-xl border-2 border-success-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-success-700 mb-1">{tCommon('status.approved')}</p>
          <p className="text-3xl font-bold text-success-900">{stats.approved}</p>
        </div>
        <div className="bg-danger-50 rounded-xl border-2 border-danger-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-danger-700 mb-1">{tCommon('status.rejected')}</p>
          <p className="text-3xl font-bold text-danger-900">{stats.rejected}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-2 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "ALL" as const, label: t('all_payments'), count: stats.total },
            { value: "PENDING" as const, label: tCommon('status.pending'), count: stats.pending },
            { value: "APPROVED" as const, label: tCommon('status.approved'), count: stats.approved },
            { value: "REJECTED" as const, label: tCommon('status.rejected'), count: stats.rejected },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === filter.value
                  ? "bg-primary-600 text-white shadow-md"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              {filter.label}
              <span className="ml-2 text-xs opacity-75">({filter.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Payment List */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
          <svg
            className="w-16 h-16 text-gray-300 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {t('no_payments', { status: statusFilter === "ALL" ? "" : statusFilter.toLowerCase() })}
          </h3>
          <p className="text-gray-600 mb-6">
            {statusFilter === "ALL"
              ? t('no_payments', { status: "" })
              : t('no_payments', { status: statusFilter.toLowerCase() })}
          </p>
          {statusFilter === "ALL" && (
            <a
              href="/user/payment"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              {tForm('submit_payment')}
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPayments.map((payment) => (
            <PaymentCard
              key={payment.id}
              payment={payment}
              houseNumber={house?.houseNumber}
            />
          ))}
        </div>
      )}
    </div>
  );
}
