'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { subMonths } from 'date-fns';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { usePagination } from '@/lib/hooks/usePagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Transaction } from '@/app/api/user/transactions/route';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as any,
    },
  },
};

type TransactionType = 'all' | 'income' | 'expense';

const categoryLabels: Record<string, string> = {
  // Income categories
  MONTHLY_FEES: 'IPL Bulanan',
  DONATIONS: 'Donasi',
  EVENTS: 'Acara',
  RENTALS: 'Sewa',
  OTHER_INCOME: 'Lainnya',

  // Expense categories
  SECURITY: 'Keamanan',
  CLEANING: 'Kebersihan',
  GARDENING: 'Taman',
  REPAIRS: 'Perbaikan',
  ELECTRICITY: 'Listrik',
  WATER: 'Air',
  ADMINISTRATION: 'Administrasi',
  OTHER_EXPENSE: 'Lainnya',
};

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TransactionType>('all');

  // Default date range: last 3 months
  const [startDate, setStartDate] = useState<Date | undefined>(subMonths(new Date(), 3));
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());

  const fetchTransactions = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate.toISOString());
      if (endDate) params.set('endDate', endDate.toISOString());
      params.set('type', typeFilter);

      const res = await fetch(`/api/user/transactions?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');

      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, typeFilter]);

  // Fetch transactions when filters change
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Calculate totals
  const totals = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      net: income - expense,
    };
  }, [transactions]);

  // Pagination
  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(transactions, {
    initialPageSize: 25,
    resetDeps: [typeFilter, startDate, endDate],
  });

  const handleDateChange = (start: Date | undefined, end: Date | undefined) => {
    setStartDate(start);
    setEndDate(end);
  };

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'income') {
      return <ArrowUpCircle className="w-4 h-4 text-emerald-500" />;
    }
    return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
  };

  if (isLoading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-16 bg-gray-200 rounded-2xl" />
          <div className="grid grid-cols-3 gap-2">
            <div className="h-20 bg-gray-200 rounded-xl" />
            <div className="h-20 bg-gray-200 rounded-xl" />
            <div className="h-20 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-32 bg-gray-200 rounded-2xl" />
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="px-4 pt-2 pb-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-slate-900">Detail Keuangan</h1>
        <p className="text-sm text-slate-400 mt-0.5">Riwayat transaksi keuangan</p>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2">
        {/* Total Income */}
        <div className="bg-emerald-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            <span className="text-[10px] text-emerald-600 font-medium">Masuk</span>
          </div>
          <p className="text-xs font-bold text-emerald-700 leading-tight">
            {formatCurrency(totals.income)}
          </p>
        </div>

        {/* Total Expense */}
        <div className="bg-red-50 rounded-xl p-3">
          <div className="flex items-center gap-1 mb-1">
            <TrendingDown className="w-3 h-3 text-red-500" />
            <span className="text-[10px] text-red-600 font-medium">Keluar</span>
          </div>
          <p className="text-xs font-bold text-red-700 leading-tight">
            {formatCurrency(totals.expense)}
          </p>
        </div>

        {/* Net Amount */}
        <div className={`${totals.net >= 0 ? 'bg-blue-50' : 'bg-amber-50'} rounded-xl p-3`}>
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className={`w-3 h-3 ${totals.net >= 0 ? 'text-blue-500' : 'text-amber-500'}`} />
            <span className={`text-[10px] font-medium ${totals.net >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              Saldo
            </span>
          </div>
          <p className={`text-xs font-bold leading-tight ${totals.net >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
            {formatCurrency(Math.abs(totals.net))}
          </p>
        </div>
      </motion.div>

      {/* Filter Section */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        {/* Type Filter Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTypeFilter('all')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setTypeFilter('income')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === 'income'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pemasukan
          </button>
          <button
            onClick={() => setTypeFilter('expense')}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === 'expense'
                ? 'bg-red-600 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Pengeluaran
          </button>
        </div>

        {/* Date Range Picker */}
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />
      </motion.div>

      {/* Transaction List */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Transaksi ({totalItems})
          </p>
          {totalItems > 0 && (
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1 border-0 outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          )}
        </div>

        {paginatedData.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500 mb-1">
              Tidak ada transaksi
            </p>
            <p className="text-xs text-slate-400">
              {startDate && endDate
                ? 'Tidak ada transaksi pada periode ini'
                : 'Pilih rentang tanggal untuk melihat transaksi'}
            </p>
          </div>
        ) : (
          <div className="space-y-0">
            {paginatedData.map((transaction, index) => (
              <motion.div
                key={transaction.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.04 }}
              >
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center flex-shrink-0">
                      {getTransactionIcon(transaction)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {transaction.description}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {categoryLabels[transaction.category] || transaction.category} •{' '}
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <p
                      className={`text-sm font-semibold ${
                        transaction.type === 'income' ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
                {index < paginatedData.length - 1 && (
                  <div className="border-b border-slate-50" />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 text-xs font-medium bg-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Prev
          </button>
          <span className="text-xs text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-xs font-medium bg-white rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Next
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
