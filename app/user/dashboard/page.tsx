"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Upload } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Loading";
import { useAuth } from "@/lib/auth-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPaymentMonth } from "@/lib/calculations";
import FloatingActionButton from "@/components/ui/FloatingActionButton";
import PaymentUploadModal from "@/components/modals/PaymentUploadModal";

interface House {
  id: string;
  houseNumber: string;
  block: string;
  houseType?: { typeName: string; price: number; description?: string };
}

interface Payment {
  id: string;
  amountMonths: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  paymentMonths?: Array<{ year: number; month: number }>;
}

export default function UserDashboardPage() {
  const { user } = useAuth();
  const [houses, setHouses] = useState<House[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [totalPaidMonths, setTotalPaidMonths] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const fetchingRef = useRef(false);

  // Memoize user.id to stabilize dependency
  const userId = useMemo(() => user?.id, [user?.id]);

  useEffect(() => {
    if (!userId || fetchingRef.current) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    fetchingRef.current = true;
    Promise.all([
      fetch(`/api/houses?userId=${userId}`).then((r) => r.json()),
      fetch("/api/payments").then((r) => r.json()),
      fetch("/api/payments/stats").then((r) => r.json()),
      fetch(`/api/expenses/monthly?year=${currentYear}&month=${currentMonth}`).then((r) => r.json()),
      fetch("/api/expenses/stats").then((r) => r.json()),
      fetch(`/api/income/monthly?year=${currentYear}&month=${currentMonth}`).then((r) => r.json()),
      fetch("/api/income/stats").then((r) => r.json()),
    ])
      .then(([housesData, paymentsData, statsData, monthlyExpData, expStatsData, monthlyIncData, incStatsData]) => {
        setHouses(housesData);
        setPayments(paymentsData);
        setMonthlyExpenses(monthlyExpData.total);
        setTotalExpenses(expStatsData.totalAmount);
        setMonthlyIncome(monthlyIncData.total);
        setTotalIncome(incStatsData.totalAmount);

        // Calculate user-specific payment stats
        const approvedPayments = paymentsData.filter((p: Payment) => p.status === "APPROVED");
        const paidMonths = approvedPayments.reduce(
          (sum: number, p: Payment) => sum + (p.paymentMonths ? p.paymentMonths.length : p.amountMonths),
          0
        );
        const totalPaidAmount = approvedPayments.reduce((sum: number, p: Payment) => sum + Number(p.totalAmount), 0);

        setTotalPaidMonths(paidMonths);
        setTotalPaid(totalPaidAmount);
        setIsLoading(false);
      })
      .catch((err) => console.error("Failed to fetch dashboard data:", err))
      .finally(() => { fetchingRef.current = false; });
  }, [userId, refreshTrigger]);

  const house = houses[0];
  const monthlyRate = house?.houseType?.price ? Number(house.houseType.price) : 0;

  // Modal handlers
  const handleOpenUploadModal = () => {
    setIsUploadModalOpen(true);
  };

  const handleUploadSuccess = () => {
    // Trigger data refresh by incrementing refreshTrigger
    setRefreshTrigger((prev) => prev + 1);
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentMonthStatus = payments.some(
    (p) => p.status === "APPROVED" && p.paymentMonths?.some((pm) => pm.year === currentYear && pm.month === currentMonth)
  )
    ? "APPROVED"
    : payments.some(
        (p) => p.status === "PENDING" && p.paymentMonths?.some((pm) => pm.year === currentYear && pm.month === currentMonth)
      )
      ? "PENDING"
      : "UNPAID";

  const currentMonthLabel = formatPaymentMonth({ year: currentYear, month: currentMonth });
  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const recentPayments = payments.slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header skeleton */}
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        {/* House info skeleton */}
        <Skeleton className="h-40" />
        {/* User metrics skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        {/* Financial metrics skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        {/* Quick actions + recent payments skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">Here&apos;s your IPL payment overview</p>
      </div>

      {/* House Information */}
      {house ? (
        <Card>
          <CardHeader>My House Information</CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                <p className="text-sm font-medium text-gray-600 mb-1">House Number</p>
                <p className="text-2xl font-bold text-gray-900">{house.houseNumber}</p>
                <p className="text-xs text-gray-500 mt-1">Block {house.block}</p>
              </div>
              <div className="bg-primary-50 rounded-lg p-4 border-2 border-primary-200">
                <p className="text-sm font-medium text-primary-700 mb-1">House Type</p>
                <p className="text-2xl font-bold text-primary-900">{house.houseType?.typeName}</p>
                {house.houseType?.description && (
                  <p className="text-xs text-primary-700 mt-1">{house.houseType.description}</p>
                )}
              </div>
              <div className="bg-success-50 rounded-lg p-4 border-2 border-success-200">
                <p className="text-sm font-medium text-success-700 mb-1">Monthly IPL</p>
                <p className="text-2xl font-bold text-success-900">{formatCurrency(monthlyRate)}</p>
                <p className="text-xs text-success-700 mt-1">per month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No House Assigned</h3>
              <p className="text-gray-600 mb-4">Please contact the administrator to assign a house to your account.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Summary */}
      {house && (
        <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Paid Months"
            value={totalPaidMonths}
            subtitle="of 12 months"
            variant="info"
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            }
          />

          <div className="relative">
            <StatCard
              title="This Month"
              value={currentMonthStatus === "APPROVED" ? "Paid" : currentMonthStatus === "PENDING" ? "Pending" : "Unpaid"}
              subtitle={currentMonthLabel + (currentMonthStatus === "PENDING" ? " · Awaiting approval" : "")}
              variant={currentMonthStatus === "APPROVED" ? "success" : currentMonthStatus === "PENDING" ? "warning" : "danger"}
              icon={
                currentMonthStatus === "APPROVED" ? (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : currentMonthStatus === "PENDING" ? (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )
              }
            />
            {currentMonthStatus === "UNPAID" && (
              <div className="mt-3">
                <Link href="/user/payment" className="inline-block">
                  <Button variant="danger" size="sm">Pay Now</Button>
                </Link>
              </div>
            )}
          </div>

          <StatCard
            title="Total Paid"
            value={totalPaid}
            subtitle="this year"
            variant="success"
            compactNumbers={true}
            compactThreshold={10_000_000}
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />

          <StatCard
            title="Pending"
            value={pendingPayments.length}
            subtitle="awaiting approval"
            variant="warning"
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Financial Overview */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Financial Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Pemasukan"
              value={totalIncome}
              subtitle="All-time income"
              variant="success"
              compactNumbers={true}
              compactThreshold={10_000_000}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />

            <StatCard
              title="Total Pengeluaran"
              value={totalExpenses}
              subtitle="All-time expenses"
              variant="danger"
              compactNumbers={true}
              compactThreshold={10_000_000}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              }
            />

            <StatCard
              title="Pemasukan Bulan Ini"
              value={monthlyIncome}
              subtitle="Current month income"
              variant="success"
              compactNumbers={true}
              compactThreshold={10_000_000}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />

            <StatCard
              title="Pengeluaran Bulan Ini"
              value={monthlyExpenses}
              subtitle="Current month expenses"
              variant="danger"
              compactNumbers={true}
              compactThreshold={10_000_000}
              icon={
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
        </div>
        </>
      )}

      {/* Quick Actions & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>Quick Actions</CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/user/payment" className="block">
                <button className="w-full flex items-center gap-4 p-4 bg-primary-50 hover:bg-primary-100 border-2 border-primary-200 rounded-lg transition-colors text-left">
                  <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Upload Payment Proof</p>
                    <p className="text-sm text-gray-600">Submit your IPL payment</p>
                  </div>
                </button>
              </Link>
              <Link href="/user/history" className="block">
                <button className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 rounded-lg transition-colors text-left">
                  <div className="w-12 h-12 bg-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">View Payment History</p>
                    <p className="text-sm text-gray-600">Check past transactions</p>
                  </div>
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader action={
            <Link href="/user/history">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          }>
            Recent Payments
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-sm">No payments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {payment.amountMonths} Month{payment.amountMonths !== 1 ? "s" : ""} Payment
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(payment.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(payment.totalAmount))}</p>
                      <Badge
                        variant={payment.status === "APPROVED" ? "success" : payment.status === "REJECTED" ? "danger" : "warning"}
                        size="sm"
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button - Mobile/Tablet Only */}
      {house?.houseType && (
        <>
          <FloatingActionButton
            onClick={handleOpenUploadModal}
            icon={<Upload className="w-6 h-6" />}
            label="Upload Pembayaran"
          />

          {/* Payment Upload Modal */}
          <PaymentUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            house={house as { id: string; houseNumber: string; houseType: { price: number } }}
            onSuccess={handleUploadSuccess}
          />
        </>
      )}
    </div>
  );
}
