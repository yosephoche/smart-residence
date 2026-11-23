"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CategoryChartDatum {
  name: string;
  amount: number;
}

interface CategoryBreakdownChartProps {
  data: CategoryChartDatum[];
}

export default function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        barCategoryGap="25%"
        margin={{ left: 8, right: 16 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#64748B" }}
          width={96}
        />
        <Tooltip
          formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
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
  );
}
