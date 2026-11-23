"use client";

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
import { formatCurrency } from "@/lib/utils";

interface MonthlyTrend {
  month: number;
  label: string;
  income: number;
  expense: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyTrend[];
}

export default function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={2} barCategoryGap="20%">
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
          formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
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
  );
}
