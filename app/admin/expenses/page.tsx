"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Table, { Pagination } from "@/components/ui/Table";
import Modal from "@/components/ui/Modal";
import ExpenseForm, { ExpenseFormData } from "@/components/forms/ExpenseForm";
import ExpenseCategoryBadge from "@/components/expenses/ExpenseCategoryBadge";
import { Skeleton } from "@/components/ui/Loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getExpenseCategoryOptions } from "@/lib/calculations";
import { exportCSV, exportXLSX, mapExpensesForExport } from "@/lib/utils/export";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = 'force-dynamic';

export default function AdminExpensesPage() {
  const t = useTranslations('expenses');
  const tCommon = useTranslations('common');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAddExpense = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await fetchExpenses();
        setShowAddModal(false);
        alert(t('expense_added_success'));
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_confirmation'))) return;

    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchExpenses();
      alert(t('expense_deleted_success'));
    }
  };

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
        <Button onClick={() => setShowAddModal(true)}>
          + {t('add_expense')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">{t('total_expenses_filtered')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFiltered)}</p>
            <p className="text-xs text-gray-500 mt-1">{filteredExpenses.length} {t('transactions')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">{t('total_expenses_all_time')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}</p>
            <p className="text-xs text-gray-500 mt-1">{expenses.length} {t('transactions')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">{t('average_expense')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(filteredExpenses.length > 0 ? totalFiltered / filteredExpenses.length : 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{t('per_transaction')}</p>
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
              <option value={0}>{t('all_years')}</option>
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
              <option value={0}>{t('all_months')}</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2000, i).toLocaleDateString("id-ID", { month: "long" })}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                {t('clear_filters')}
              </Button>
            )}

            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleExport("csv")}>
                {t('export_csv')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleExport("xlsx")}>
                {t('export_excel')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>{t('all_expenses')} ({filteredExpenses.length})</CardHeader>
        <CardContent>
          <Table
            columns={[
              { key: "date", header: t('date'), sortable: true, render: (val) => formatDate(val) },
              { key: "category", header: t('category'), render: (val) => <ExpenseCategoryBadge category={val} /> },
              { key: "description", header: t('description') },
              { key: "amount", header: t('amount'), sortable: true, render: (val) => formatCurrency(Number(val)) },
              { key: "creator", header: t('created_by'), render: (val) => val?.name ?? "-" },
              {
                key: "id",
                header: tCommon('table.actions'),
                render: (val) => (
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(val)}>
                      {tCommon('actions.delete')}
                    </Button>
                  </div>
                ),
              },
            ]}
            data={paginatedData}
            keyExtractor={(row) => row.id}
            emptyMessage={t('no_expenses_found')}
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

      {/* Add Expense Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t('add_new_expense')}>
        <ExpenseForm
          onSubmit={handleAddExpense}
          onCancel={() => setShowAddModal(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </div>
  );
}
