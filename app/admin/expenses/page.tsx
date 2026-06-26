"use client";

import { motion } from "framer-motion";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

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
      const formData = new FormData();
      formData.append("date", data.date);
      formData.append("category", data.category);
      formData.append("amount", String(data.amount));
      formData.append("description", data.description);
      if (data.notes) formData.append("notes", data.notes);
      if (data.proofImage) formData.append("proofImage", data.proofImage);

      const res = await fetch("/api/expenses", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchExpenses();
        setShowAddModal(false);
        toast.success(t('expense_added_success'));
      } else {
        const error = await res.json();
        toast.error(error.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditExpense = async (data: ExpenseFormData) => {
    if (!editingExpense) return;
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("date", data.date);
      formData.append("category", data.category);
      formData.append("amount", String(data.amount));
      formData.append("description", data.description);
      if (data.notes !== undefined) formData.append("notes", data.notes ?? "");
      if (data.proofImage) formData.append("proofImage", data.proofImage);

      const res = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        await fetchExpenses();
        setEditingExpense(null);
        toast.success(t('expense_updated_success'));
      } else {
        const error = await res.json();
        toast.error(error.error);
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
      toast.success(t('expense_deleted_success'));
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t('title')}</h1>
          <p className="text-slate-600 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          + {t('add_expense')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-slate-600">{t('total_expenses_filtered')}</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalFiltered)}</p>
            <p className="text-xs text-slate-500 mt-1">{filteredExpenses.length} {t('transactions')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-600">{t('total_expenses_all_time')}</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}</p>
            <p className="text-xs text-slate-500 mt-1">{expenses.length} {t('transactions')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-slate-600">{t('average_expense')}</p>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(filteredExpenses.length > 0 ? totalFiltered / filteredExpenses.length : 0)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{t('per_transaction')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Kategori */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{t('all_categories')}</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  categoryFilter !== "ALL"
                    ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <option value="ALL">{t('all_categories')}</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            {/* Tahun */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Tahun</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  filterYear !== 0
                    ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <option value={0}>{t('all_years')}</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            {/* Bulan */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bulan</label>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  filterMonth !== 0
                    ? "border-blue-400 bg-blue-50 text-blue-700 font-medium"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                <option value={0}>{t('all_months')}</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleDateString("id-ID", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            {/* Export */}
            <div className="ml-auto flex gap-2 self-end">
              <button onClick={() => handleExport("csv")} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                CSV
              </button>
              <button onClick={() => handleExport("xlsx")} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                Excel
              </button>
            </div>
          </div>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Filter aktif:</span>
            {categoryFilter !== "ALL" && (
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {categories.find(c => c.value === categoryFilter)?.label}
                <button onClick={() => setCategoryFilter("ALL")} className="hover:text-blue-900 ml-0.5">✕</button>
              </span>
            )}
            {filterYear !== 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {filterYear}
                <button onClick={() => { setFilterYear(0); setFilterMonth(0); }} className="hover:text-blue-900 ml-0.5">✕</button>
              </span>
            )}
            {filterMonth !== 0 && (
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                {new Date(2000, filterMonth - 1).toLocaleDateString("id-ID", { month: "long" })}
                <button onClick={() => setFilterMonth(0)} className="hover:text-blue-900 ml-0.5">✕</button>
              </span>
            )}
            <button onClick={handleClearFilters} className="text-[11px] text-slate-400 hover:text-red-500 underline underline-offset-2 ml-1 transition-colors">
              {t('clear_filters')}
            </button>
          </div>
        )}
      </div>

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
                key: "proofImagePath",
                header: t('proof_of_payment'),
                render: (val) =>
                  val ? (
                    <a
                      href={val}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline text-sm"
                    >
                      {t('view_proof')}
                    </a>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                key: "id",
                header: tCommon('table.actions'),
                render: (val, row) => (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditingExpense(row)}>
                      {tCommon('actions.edit')}
                    </Button>
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

      {/* Edit Expense Modal */}
      <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title={t('edit_expense_title')}>
        {editingExpense && (
          <ExpenseForm
            onSubmit={handleEditExpense}
            onCancel={() => setEditingExpense(null)}
            isSubmitting={isSubmitting}
            initialData={editingExpense}
            existingProofUrl={editingExpense.proofImagePath ?? undefined}
          />
        )}
      </Modal>
    </motion.div>
  );
}