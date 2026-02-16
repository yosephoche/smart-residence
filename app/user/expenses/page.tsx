"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table, { Pagination } from "@/components/ui/Table";
import ExpenseCategoryBadge from "@/components/expenses/ExpenseCategoryBadge";
import { Skeleton } from "@/components/ui/Loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getExpenseCategoryOptions } from "@/lib/calculations";
import { exportCSV, exportXLSX, mapExpensesForExport } from "@/lib/utils/export";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = 'force-dynamic';

export default function UserExpensesPage() {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const tMonths = useTranslations('months');
  const tPayments = useTranslations('payments.admin');
  const tTable = useTranslations('common.table');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [filterMonth, setFilterMonth] = useState(0);
  const [filterYear, setFilterYear] = useState(0);

  const categories = getExpenseCategoryOptions();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    const res = await fetch("/api/expenses");
    const data = await res.json();
    setExpenses(data);
    setIsLoading(false);
  };

  // Client-side filtering
  const filteredExpenses = useMemo(() => {
    let result = expenses;

    if (categoryFilter !== "ALL") {
      result = result.filter((e) => e.category === categoryFilter);
    }

    if (filterYear !== 0 && filterMonth !== 0) {
      result = result.filter((e) => {
        const date = new Date(e.date);
        return date.getFullYear() === filterYear && date.getMonth() + 1 === filterMonth;
      });
    } else if (filterYear !== 0) {
      result = result.filter((e) => {
        const date = new Date(e.date);
        return date.getFullYear() === filterYear;
      });
    }

    return result;
  }, [expenses, categoryFilter, filterYear, filterMonth]);

  // Pagination
  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredExpenses, {
    initialPageSize: 25,
    resetDeps: [categoryFilter, filterYear, filterMonth],
  });

  // Dynamic years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    expenses.forEach((e) => {
      years.add(new Date(e.date).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [expenses]);

  const totalFiltered = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const handleClearFilters = () => {
    setCategoryFilter("ALL");
    setFilterMonth(0);
    setFilterYear(0);
  };

  const hasActiveFilters = categoryFilter !== "ALL" || filterMonth !== 0 || filterYear !== 0;

  const handleExport = (format: "csv" | "xlsx") => {
    const { headers, rows } = mapExpensesForExport(filteredExpenses);
    const filename = `expenses-${new Date().toISOString().split("T")[0]}`;

    if (format === "csv") {
      exportCSV(filename, headers, rows);
    } else {
      exportXLSX(filename, headers, rows);
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">{t('total_expenses')} ({tCommon('actions.filter')}ed)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFiltered)}</p>
            <p className="text-xs text-gray-500 mt-1">{filteredExpenses.length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">{t('total_expenses')} (All Time)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}</p>
            <p className="text-xs text-gray-500 mt-1">{expenses.length} transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">Average Expense</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(filteredExpenses.length > 0 ? totalFiltered / filteredExpenses.length : 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="ALL">{t('all_categories')}</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg"
            >
              <option value={0}>{tPayments('all_years')}</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg"
              disabled={filterYear === 0}
            >
              <option value={0}>{tPayments('all_months')}</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {tMonths(new Date(2000, i).toLocaleDateString("en-US", { month: "long" }).toLowerCase())}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                {tPayments('clear_filter')}
              </Button>
            )}

            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleExport("csv")}>
                {tPayments('export_csv')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleExport("xlsx")}>
                {tPayments('export_xlsx')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>{tCommon('status.all')} {t('title')} ({filteredExpenses.length})</CardHeader>
        <CardContent>
          <Table
            columns={[
              { key: "date", header: tTable('created'), sortable: true, render: (val) => formatDate(val) },
              { key: "category", header: "Category", render: (val) => <ExpenseCategoryBadge category={val} /> },
              { key: "description", header: "Description" },
              { key: "amount", header: "Amount", sortable: true, render: (val) => formatCurrency(Number(val)) },
              { key: "notes", header: "Notes", render: (val) => val || "-" },
            ]}
            data={paginatedData}
            keyExtractor={(row) => row.id}
            emptyMessage={t('no_expenses')}
          />

          {/* Pagination */}
          {paginatedData.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalItems={totalItems}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
