"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import { Skeleton } from "@/components/ui/Loading";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MonthlyTrend {
  month: number;
  label: string;
  income: number;
  expense: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  MAINTENANCE: "Pemeliharaan",
  SECURITY: "Keamanan",
  UTILITIES: "Utilitas",
  CLEANING: "Kebersihan",
  LANDSCAPING: "Pertamanan",
  ADMINISTRATION: "Administrasi",
  OTHER: "Lainnya",
};

const currencyFormatter = (value: number) => formatCurrency(value);

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const currentYear = new Date().getFullYear();

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [byCategory, setByCategory] = useState<CategoryBreakdown[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/income/stats").then((r) => r.json()),
      fetch("/api/expenses/stats").then((r) => r.json()),
      fetch(`/api/admin/monthly-trend?year=${currentYear}`).then((r) => r.json()),
    ]).then(([incomeStats, expenseStats, trend]) => {
      setTotalIncome(incomeStats.totalAmount ?? 0);
      setTotalExpenses(expenseStats.totalAmount ?? 0);
      setByCategory(expenseStats.byCategory ?? []);
      setMonthlyTrend(trend);
      setIsLoading(false);
    });
  }, [currentYear]);

  const saldo = totalIncome - totalExpenses;

  const categoryChartData = byCategory
    .map((item) => ({
      name: CATEGORY_LABELS[item.category] ?? item.category,
      amount: item.amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-600 mt-1">Ringkasan keuangan perumahan</p>
      </div>

      {/* Section 1 — 3 KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Pemasukan"
          value={totalIncome}
          subtitle="Seluruh pemasukan"
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
          subtitle="Seluruh pengeluaran"
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
          title="Saldo"
          value={saldo}
          subtitle="Pemasukan - Pengeluaran"
          variant={saldo >= 0 ? "success" : "danger"}
          compactNumbers={true}
          compactThreshold={10_000_000}
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Section 2 — Monthly Trend Chart */}
      <Card>
        <CardHeader action={<span className="text-sm font-normal text-gray-500">{currentYear}</span>}>
          Pemasukan &amp; Pengeluaran Bulanan
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend} barGap={2} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#94A3B8" }}
                  dy={4}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number | undefined) => currencyFormatter(value ?? 0)}
                  labelStyle={{ fontWeight: 600, color: "#0F172A" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #E2E8F0",
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value) => (value === "income" ? "Pemasukan" : "Pengeluaran")}
                />
                <Bar dataKey="income" name="income" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={16} />
                <Bar dataKey="expense" name="expense" fill="#F87171" radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Expense by Category */}
      {categoryChartData.length > 0 && (
        <Card>
          <CardHeader>Pengeluaran per Kategori</CardHeader>
          <CardContent>
            <div style={{ height: Math.max(160, categoryChartData.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  barCategoryGap="25%"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                  <XAxis
                    type="number"
                    hide
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748B" }}
                    width={96}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => currencyFormatter(value ?? 0)}
                    labelStyle={{ fontWeight: 600, color: "#0F172A" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid #E2E8F0",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="amount" name="Pengeluaran" fill="#F59E0B" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
