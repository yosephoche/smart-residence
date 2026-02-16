"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Table, { Column, Pagination } from "@/components/ui/Table";
import { ConfirmModal } from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import { HouseType, House } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = 'force-dynamic';

export default function HouseTypesPage() {
  const t = useTranslations('house_types');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [houseTypes, setHouseTypes] = useState<HouseType[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState<HouseType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchData = async () => {
    try {
      const [houseTypesRes, housesRes] = await Promise.all([
        fetch("/api/house-types"),
        fetch("/api/houses"),
      ]);
      if (houseTypesRes.ok) {
        const houseTypesData = await houseTypesRes.json();
        setHouseTypes(houseTypesData);
      }
      if (housesRes.ok) {
        const housesData = await housesRes.json();
        setHouses(housesData);
      }
    } catch {
      // silently handle
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter house types
  const filteredTypes = useMemo(() => {
    if (!searchQuery) return houseTypes;

    const query = searchQuery.toLowerCase();
    return houseTypes.filter((type) =>
      type.typeName.toLowerCase().includes(query)
    );
  }, [houseTypes, searchQuery]);

  // Pagination
  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredTypes, {
    initialPageSize: 25,
    resetDeps: [searchQuery],
  });

  const handleDeleteClick = (type: HouseType) => {
    // Check if any houses use this type
    const housesWithType = houses.filter((h) => h.houseTypeId === type.id);
    if (housesWithType.length > 0) {
      setErrorMessage(
        t('cannot_delete', { typeName: type.typeName, count: housesWithType.length })
      );
      setTimeout(() => setErrorMessage(""), 8000);
      return;
    }

    setTypeToDelete(type);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return;

    setIsDeleting(true);

    const res = await fetch(`/api/house-types/${typeToDelete.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setSuccessMessage(t('deleted_success', { typeName: typeToDelete.typeName }));
      setTimeout(() => setSuccessMessage(""), 5000);
      // Re-fetch house types
      const houseTypesRes = await fetch("/api/house-types");
      if (houseTypesRes.ok) {
        const houseTypesData = await houseTypesRes.json();
        setHouseTypes(houseTypesData);
      }
    } else {
      const err = await res.json();
      setErrorMessage(err.error || t('delete_error'));
      setTimeout(() => setErrorMessage(""), 5000);
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setTypeToDelete(null);
  };

  const columns: Column<HouseType>[] = [
    {
      key: "typeName",
      header: t('type_name'),
      sortable: true,
      render: (_, type) => (
        <div>
          <p className="font-semibold text-gray-900 text-lg">{type.typeName}</p>
          {type.description && (
            <p className="text-sm text-gray-500 mt-0.5">{type.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "price",
      header: t('monthly_price'),
      sortable: true,
      render: (price) => (
        <div>
          <p className="font-bold text-primary-600 text-xl">
            {formatCurrency(price)}
          </p>
          <p className="text-xs text-gray-500">{t('per_month')}</p>
        </div>
      ),
    },
    {
      key: "id",
      header: t('usage'),
      render: (_, type) => {
        const count = houses.filter((h) => h.houseTypeId === type.id).length;
        return (
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{count}</p>
            <p className="text-xs text-gray-500">{t('houses')}</p>
          </div>
        );
      },
    },
    {
      key: "id",
      header: tCommon('table.actions'),
      render: (_, type) => {
        const housesCount = houses.filter((h) => h.houseTypeId === type.id).length;

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/admin/house-types/${type.id}/edit`)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              {tCommon('actions.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteClick(type)}
              className="text-danger-600 hover:bg-danger-50"
              disabled={housesCount > 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {tCommon('actions.delete')}
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            {t('title')}
          </h1>
          <p className="text-gray-600 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Link href="/admin/house-types/create">
          <Button variant="primary" size="lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('add_type')}
          </Button>
        </Link>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert variant="success" message={successMessage} autoClose />
      )}

      {/* Error Message */}
      {errorMessage && (
        <Alert variant="error" message={errorMessage} onClose={() => setErrorMessage("")} />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600">{t('total_types')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{houseTypes.length}</p>
        </div>
        <div className="bg-success-50 rounded-xl border-2 border-success-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-success-700">{t('houses_using_types')}</p>
          <p className="text-3xl font-bold text-success-900 mt-1">{houses.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
        <Input
          placeholder={t('search_placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
          fullWidth
        />

        <div className="mt-4 pt-4 border-t-2 border-gray-100">
          <span className="text-sm text-gray-600">
            {t('showing_count', { filtered: filteredTypes.length, total: houseTypes.length })}
          </span>
        </div>
      </div>

      {/* House Types Table */}
      <Table
        data={paginatedData}
        columns={columns}
        keyExtractor={(type) => type.id}
        emptyMessage={t('no_types_found')}
      />

      {/* Pagination */}
      {paginatedData.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalItems={totalItems}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('delete_type')}
        message={t('delete_confirmation', { typeName: typeToDelete?.typeName ?? '' })}
        confirmText={tCommon('actions.delete')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
