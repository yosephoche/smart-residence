import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';

interface FinancialChartProps {
  data: Array<{ month: string; income: number; expense: number }>;
}

export function FinancialChart({ data }: FinancialChartProps) {
  return (
    <div className="h-[120px] -mx-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={2} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            dy={4}
          />
          <YAxis hide />
          <Bar dataKey="income" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={14} />
          <Bar dataKey="expense" fill="#BFDBFE" radius={[4, 4, 0, 0]} maxBarSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
