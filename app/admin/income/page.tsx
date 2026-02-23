"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table, { Pagination } from "@/components/ui/Table";
import Modal, { ConfirmModal } from "@/components/ui/Modal";
import IncomeForm, { IncomeFormData } from "@/components/forms/IncomeForm";
import IncomeCategoryBadge from "@/components/income/IncomeCategoryBadge";
import { Skeleton } from "@/components/ui/Loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getIncomeCategoryOptions } from "@/lib/calculations";
import { exportCSV, exportXLSX, mapIncomesForExport } from "@/lib/utils/export";
import { usePagination } from "@/lib/hooks/usePagination";

export default function AdminIncomePage() {
  const t = useTranslations('income');
  const tCommon = useTranslations('common');
  const [incomes, setIncomes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL"); // "ALL" | "MANUAL" | "AUTO"
  const [filterMonth, setFilterMonth] = useState(0);
  const [filterYear, setFilterYear] = useState(0);

  const categories = getIncomeCategoryOptions();

  useEffect(() => {
    fetchIncomes();
  }, []);

  const fetchIncomes = async () => {
    setIsLoading(true);
    const res = await fetch("/api/income");
    const data = await res.json();
    setIncomes(data);
    setIsLoading(false);
  };

  // Client-side filtering
  const filteredIncomes = useMemo(() => {
    let result = incomes;

    if (categoryFilter !== "ALL") {
      result = result.filter((i) => i.category === categoryFilter);
    }

    if (sourceFilter === "MANUAL") {
      result = result.filter((i) => i.paymentId === null);
    } else if (sourceFilter === "AUTO") {
      result = result.filter((i) => i.paymentId !== null);
    }

    if (filterYear !== 0 && filterMonth !== 0) {
      result = result.filter((i) => {
        const date = new Date(i.date);
        return date.getFullYear() === filterYear && date.getMonth() + 1 === filterMonth;
      });
    } else if (filterYear !== 0) {
      result = result.filter((i) => {
        const date = new Date(i.date);
        return date.getFullYear() === filterYear;
      });
    }

    return result;
  }, [incomes, categoryFilter, sourceFilter, filterYear, filterMonth]);

  // Pagination
  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredIncomes, {
    initialPageSize: 25,
    resetDeps: [categoryFilter, sourceFilter, filterYear, filterMonth],
  });

  // Dynamic years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    incomes.forEach((i) => {
      years.add(new Date(i.date).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [incomes]);

  const totalFiltered = filteredIncomes.reduce((sum, i) => sum + Number(i.amount), 0);

  const handleAddIncome = async (data: IncomeFormData) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/income", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await fetchIncomes();
        setShowAddModal(false);
        toast.success(t('income_added'));
      } else {
        const error = await res.json();
        toast.error(error.error || t('add_error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/income/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchIncomes();
      toast.success(t('income_deleted'));
    }
    setDeleteTargetId(null);
  };

  const handleClearFilters = () => {
    setCategoryFilter("ALL");
    setSourceFilter("ALL");
    setFilterMonth(0);
    setFilterYear(0);
  };

  const hasActiveFilters = categoryFilter !== "ALL" || sourceFilter !== "ALL" || filterMonth !== 0 || filterYear !== 0;

  const handleExport = (format: "csv" | "xlsx") => {
    const { headers, rows } = mapIncomesForExport(filteredIncomes);
    const filename = `pemasukan-${new Date().toISOString().split("T")[0]}`;

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
          + {t('add_income')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">{t('filtered_total')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFiltered)}</p>
            <p className="text-xs text-gray-500 mt-1">{t('transactions_count', { count: filteredIncomes.length })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">{t('all_total')}</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(incomes.reduce((sum, i) => sum + Number(i.amount), 0))}</p>
            <p className="text-xs text-gray-500 mt-1">{t('transactions_count', { count: incomes.length })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-gray-600">{t('average')}</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(filteredIncomes.length > 0 ? totalFiltered / filteredIncomes.length : 0)}
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
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="ALL">{t('all_sources')}</option>
              <option value="MANUAL">{t('manual_only')}</option>
              <option value="AUTO">{t('auto_from_payment')}</option>
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
                {tCommon('actions.export')} CSV
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
        <CardHeader>{t('all_income_count', { count: filteredIncomes.length })}</CardHeader>
        <CardContent>
          <Table
            columns={[
              { key: "date", header: t('date'), sortable: true, render: (val) => formatDate(val) },
              { key: "category", header: t('category'), render: (val) => <IncomeCategoryBadge category={val} /> },
              { key: "description", header: t('description') },
              { key: "amount", header: t('amount'), sortable: true, render: (val) => formatCurrency(Number(val)) },
              {
                key: "paymentId",
                header: t('source'),
                render: (val) =>
                  val ? (
                    <Badge variant="info" size="sm">
                      {t('auto')}
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      {t('manual')}
                    </Badge>
                  ),
              },
              { key: "creator", header: t('created_by'), render: (val) => val?.name ?? "-" },
              {
                key: "id",
                header: tCommon('table.actions'),
                render: (val, row) => {
                  const isAutoGenerated = row.paymentId !== null;
                  return (
                    <div className="flex gap-2">
                      {!isAutoGenerated && (
                        <Button variant="danger" size="sm" onClick={() => setDeleteTargetId(val)}>
                          {tCommon('actions.delete')}
                        </Button>
                      )}
                      {isAutoGenerated && (
                        <span className="text-xs text-gray-500 italic">{t('read_only')}</span>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={paginatedData}
            keyExtractor={(row) => row.id}
            emptyMessage={t('no_income')}
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

      {/* Add Income Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={t('add_income_title')}>
        <IncomeForm
          onSubmit={handleAddIncome}
          onCancel={() => setShowAddModal(false)}
          isSubmitting={isSubmitting}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && handleDelete(deleteTargetId)}
        title={tCommon('actions.delete')}
        message={t('delete_confirmation')}
        variant="danger"
        confirmText={tCommon('actions.delete')}
        cancelText={tCommon('actions.cancel')}
      />
    </div>
  );
}
