"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Loading";
import { useAuth } from "@/lib/auth-client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPaymentMonth } from "@/lib/calculations";

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
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    Promise.all([
      fetch(`/api/houses?userId=${user.id}`).then((r) => r.json()),
      fetch("/api/payments").then((r) => r.json()),
      fetch("/api/payments/stats").then((r) => r.json()),
      fetch(`/api/expenses/monthly?year=${currentYear}&month=${currentMonth}`).then((r) => r.json()),
    ]).then(([housesData, paymentsData, statsData, expData]) => {
      setHouses(housesData);
      setPayments(paymentsData);
      setTotalRevenue(statsData.totalRevenue);
      setMonthlyExpenses(expData.total);
      setIsLoading(false);
    });
  }, [user]);

  const house = houses[0];
  const monthlyRate = house?.houseType?.price ? Number(house.houseType.price) : 0;

  const approvedPayments = payments.filter((p) => p.status === "APPROVED");
  const totalPaidMonths = approvedPayments.reduce(
    (sum, p) => sum + (p.paymentMonths ? p.paymentMonths.length : p.amountMonths),
    0
  );
  const totalPaid = approvedPayments.reduce((sum, p) => sum + Number(p.totalAmount), 0);
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
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <Skeleton className="h-40" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
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
          <div className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-600 mb-1">Paid Months</p>
            <p className="text-3xl font-bold text-gray-900">{totalPaidMonths}</p>
            <p className="text-xs text-gray-500 mt-1">of 12 months</p>
          </div>
          <div className={`rounded-xl border-2 p-5 shadow-sm ${
            currentMonthStatus === "APPROVED"
              ? "bg-success-50 border-success-200"
              : currentMonthStatus === "PENDING"
                ? "bg-warning-50 border-warning-200"
                : "bg-danger-50 border-danger-200"
          }`}>
            <p className={`text-sm font-medium mb-1 ${
              currentMonthStatus === "APPROVED"
                ? "text-success-700"
                : currentMonthStatus === "PENDING"
                  ? "text-warning-700"
                  : "text-danger-700"
            }`}>This Month</p>
            <p className={`text-3xl font-bold ${
              currentMonthStatus === "APPROVED"
                ? "text-success-900"
                : currentMonthStatus === "PENDING"
                  ? "text-warning-900"
                  : "text-danger-900"
            }`}>
              {currentMonthStatus === "APPROVED" ? "Paid" : currentMonthStatus === "PENDING" ? "Pending" : "Unpaid"}
            </p>
            <p className={`text-xs mt-1 ${
              currentMonthStatus === "APPROVED"
                ? "text-success-700"
                : currentMonthStatus === "PENDING"
                  ? "text-warning-700"
                  : "text-danger-700"
            }`}>{currentMonthLabel}{currentMonthStatus === "PENDING" && " · Awaiting approval"}</p>
            {currentMonthStatus === "UNPAID" && (
              <Link href="/user/payment" className="inline-block mt-2">
                <Button variant="danger" size="sm">Pay Now</Button>
              </Link>
            )}
          </div>
          <div className="bg-success-50 rounded-xl border-2 border-success-200 p-5 shadow-sm">
            <p className="text-sm font-medium text-success-700 mb-1">Total Paid</p>
            <p className="text-xl font-bold text-success-900">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-success-700 mt-1">this year</p>
          </div>
          <div className="bg-warning-50 rounded-xl border-2 border-warning-200 p-5 shadow-sm">
            <p className="text-sm font-medium text-warning-700 mb-1">Pending</p>
            <p className="text-3xl font-bold text-warning-900">{pendingPayments.length}</p>
            <p className="text-xs text-warning-700 mt-1">awaiting approval</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-primary-50 rounded-xl border-2 border-primary-200 p-5 shadow-sm">
            <p className="text-sm font-medium text-primary-700 mb-1">Total Revenue</p>
            <p className="text-xl font-bold text-primary-900">{formatCurrency(totalRevenue)}</p>
            <p className="text-xs text-primary-700 mt-1">All residents</p>
          </div>
          <div className="bg-danger-50 rounded-xl border-2 border-danger-200 p-5 shadow-sm">
            <p className="text-sm font-medium text-danger-700 mb-1">Monthly Expenses</p>
            <p className="text-xl font-bold text-danger-900">{formatCurrency(monthlyExpenses)}</p>
            <p className="text-xs text-danger-700 mt-1">Current month</p>
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
    </div>
  );
}
