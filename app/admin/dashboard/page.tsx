"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Loading";
import { formatCurrency, formatDate } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface House {
  id: string;
  houseNumber: string;
  userId?: string | null;
  houseType?: { typeName: string; price: number };
}

interface Payment {
  id: string;
  userId: string;
  houseId: string;
  amountMonths: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

interface PaymentStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalRevenue: number;
}

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/houses").then((r) => r.json()),
      fetch("/api/payments").then((r) => r.json()),
      fetch("/api/payments/stats").then((r) => r.json()),
      fetch(`/api/expenses/monthly?year=${currentYear}&month=${currentMonth}`).then((r) => r.json()),
      fetch("/api/expenses/stats").then((r) => r.json()),
    ]).then(([usersData, housesData, paymentsData, statsData, monthlyExpData, expStatsData]) => {
      setUsers(usersData);
      setHouses(housesData);
      setPayments(paymentsData);
      setStats(statsData);
      setMonthlyExpenses(monthlyExpData.total);
      setTotalExpenses(expStatsData.totalAmount);
      setIsLoading(false);
    });
  }, []);

  const totalUsers = users.filter((u) => u.role === "USER").length;
  const occupiedHouses = houses.filter((h) => h.userId).length;
  const totalHouses = houses.length;
  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const netRevenue = (stats?.totalRevenue ?? 0) - totalExpenses;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Dashboard Overview
        </h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your residential area.
        </p>
      </div>

      {/* Financial Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          subtitle={`${stats?.approved ?? 0} approved payments`}
          variant="success"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Monthly Expenses"
          value={formatCurrency(monthlyExpenses)}
          subtitle="Current month expenses"
          variant="danger"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Operational Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Residents"
          value={totalUsers}
          subtitle={`${totalUsers} active residents`}
          variant="primary"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />

        <StatCard
          title="Houses"
          value={`${occupiedHouses}/${totalHouses}`}
          subtitle={`${totalHouses - occupiedHouses} available`}
          variant="info"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <StatCard
          title="Pending Payments"
          value={stats?.pending ?? 0}
          subtitle="Awaiting approval"
          variant="warning"
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Payments */}
        <Card>
          <CardHeader action={
            <Link href="/admin/payments">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          }>
            Pending Payments
          </CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No pending payments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.slice(0, 5).map((payment) => {
                  const user = users.find((u) => u.id === payment.userId);
                  const house = houses.find((h) => h.id === payment.houseId);

                  return (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {house?.houseNumber} • {payment.amountMonths} months • {formatCurrency(payment.totalAmount)}
                        </p>
                      </div>
                      <Badge variant="warning" size="sm">
                        Pending
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Residents */}
        <Card>
          <CardHeader action={
            <Link href="/admin/users">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          }>
            Recent Residents
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users
                .filter((u) => u.role === "USER")
                .slice(0, 5)
                .map((user) => {
                  const userHouses = houses.filter((h) => h.userId === user.id);

                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      {userHouses.length > 0 && (
                        <Badge variant="info" size="sm">
                          {userHouses[0].houseNumber}
                        </Badge>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Statistics */}
      <Card>
        <CardHeader>Payment Statistics</CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
              <p className="text-xs font-medium text-gray-600 mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.total ?? 0}</p>
            </div>
            <div className="p-4 bg-warning-50 rounded-lg border-2 border-warning-200">
              <p className="text-xs font-medium text-warning-700 mb-1">Pending</p>
              <p className="text-2xl font-bold text-warning-900">{stats?.pending ?? 0}</p>
            </div>
            <div className="p-4 bg-success-50 rounded-lg border-2 border-success-200">
              <p className="text-xs font-medium text-success-700 mb-1">Approved</p>
              <p className="text-2xl font-bold text-success-900">{stats?.approved ?? 0}</p>
            </div>
            <div className="p-4 bg-danger-50 rounded-lg border-2 border-danger-200">
              <p className="text-xs font-medium text-danger-700 mb-1">Rejected</p>
              <p className="text-2xl font-bold text-danger-900">{stats?.rejected ?? 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Net Revenue Card */}
      <Card>
        <CardHeader>Net Revenue</CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Revenue - Total Expenses</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(netRevenue)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {formatCurrency(stats?.totalRevenue ?? 0)} - {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
              netRevenue >= 0 ? "bg-success-100" : "bg-danger-100"
            }`}>
              <svg className={`w-8 h-8 ${netRevenue >= 0 ? "text-success-600" : "text-danger-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={netRevenue >= 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
