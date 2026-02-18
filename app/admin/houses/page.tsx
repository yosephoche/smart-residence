"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Table, { Column, Pagination } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Modal, { ConfirmModal } from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import { House, User } from "@/types";
import { formatCurrency } from "@/lib/utils";
import ImportHousesForm from "@/components/forms/ImportHousesForm";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = 'force-dynamic';

export default function HousesPage() {
  const t = useTranslations('houses');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [houses, setHouses] = useState<House[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [blockFilter, setBlockFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OCCUPIED" | "VACANT">("ALL");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [houseToDelete, setHouseToDelete] = useState<House | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = async () => {
    try {
      const [housesRes, usersRes] = await Promise.all([
        fetch("/api/houses"),
        fetch("/api/users"),
      ]);
      if (housesRes.ok) {
        const housesData = await housesRes.json();
        setHouses(housesData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
    } catch {
      // silently handle
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Get unique blocks for filter
  const blocks = useMemo(() => {
    const uniqueBlocks = Array.from(new Set(houses.map((h) => h.block)));
    return uniqueBlocks.sort();
  }, [houses]);

  // Filter houses
  const filteredHouses = useMemo(() => {
    let filtered = houses;

    // Apply block filter
    if (blockFilter !== "ALL") {
      filtered = filtered.filter((house) => house.block === blockFilter);
    }

    // Apply status filter
    if (statusFilter === "OCCUPIED") {
      filtered = filtered.filter((house) => house.userId);
    } else if (statusFilter === "VACANT") {
      filtered = filtered.filter((house) => !house.userId);
    }

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((house) =>
        house.houseNumber.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [houses, searchQuery, blockFilter, statusFilter]);

  // Pagination
  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredHouses, {
    initialPageSize: 25,
    resetDeps: [searchQuery, blockFilter, statusFilter],
  });

  const handleDeleteClick = (house: House) => {
    setHouseToDelete(house);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!houseToDelete) return;

    setIsDeleting(true);

    const res = await fetch(`/api/houses/${houseToDelete.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setSuccessMessage(t('delete_success', { houseNumber: houseToDelete.houseNumber }));
      setTimeout(() => setSuccessMessage(""), 5000);
      // Re-fetch houses
      const housesRes = await fetch("/api/houses");
      if (housesRes.ok) {
        const housesData = await housesRes.json();
        setHouses(housesData);
      }
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setHouseToDelete(null);
  };

  const columns: Column<House>[] = [
    {
      key: "houseNumber",
      header: t('house_number'),
      sortable: true,
      render: (_, house) => (
        <div>
          <p className="font-semibold text-gray-900 text-lg">{house.houseNumber}</p>
          <p className="text-xs text-gray-500">{t('block')} {house.block}</p>
        </div>
      ),
    },
    {
      key: "houseType",
      header: t('type_and_price'),
      render: (_, house) => (
        <div>
          <p className="font-medium text-gray-900">{house.houseType?.typeName}</p>
          <p className="text-sm text-gray-600">
            {house.houseType && formatCurrency(house.houseType.price)}/{t('per_month')}
          </p>
        </div>
      ),
    },
    {
      key: "userId",
      header: t('resident'),
      render: (userId) => {
        if (!userId) {
          return <Badge variant="default">{t('vacant')}</Badge>;
        }
        const user = users.find((u) => u.id === userId);
        return user ? (
          <div>
            <p className="font-medium text-gray-900 text-sm">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        ) : (
          <span className="text-gray-400">{tCommon('unknown')}</span>
        );
      },
    },
    {
      key: "renterName",
      header: t('renter_info'),
      render: (_, house) => {
        if (!house.isRented) {
          return <Badge variant="default">{t('not_rented')}</Badge>;
        }
        return (
          <div>
            <Badge variant="warning" dot className="mb-1">
              {t('rented')}
            </Badge>
            {house.renterName && (
              <p className="text-sm font-medium text-gray-900 mt-1">
                {house.renterName}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: tCommon('table.status'),
      render: (_, house) =>
        house.userId ? (
          <Badge variant="success" dot>
            {t('occupied')}
          </Badge>
        ) : (
          <Badge variant="default">{t('vacant')}</Badge>
        ),
    },
    {
      key: "id",
      header: tCommon('table.actions'),
      render: (_, house) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/houses/${house.id}/edit`)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {tCommon('actions.edit')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(house)}
            className="text-danger-600 hover:bg-danger-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {tCommon('actions.delete')}
          </Button>
        </div>
      ),
    },
  ];

  const occupiedCount = houses.filter((h) => h.userId).length;
  const vacantCount = houses.length - occupiedCount;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-5 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
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
          {[...Array(5)].map((_, i) => (
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
        <div className="flex gap-3">
          <Button variant="secondary" size="lg" onClick={() => setImportModalOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {t('import_csv')}
          </Button>
          <Link href="/admin/houses/create">
            <Button variant="primary" size="lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('add_house')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert variant="success" message={successMessage} autoClose />
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600">{t('total_houses')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{houses.length}</p>
        </div>
        <div className="bg-success-50 rounded-xl border-2 border-success-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-success-700">{t('occupied')}</p>
          <p className="text-3xl font-bold text-success-900 mt-1">{occupiedCount}</p>
        </div>
        <div className="bg-gray-50 rounded-xl border-2 border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-700">{t('vacant')}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{vacantCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
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
          </div>
          <select
            value={blockFilter}
            onChange={(e) => setBlockFilter(e.target.value)}
            className="px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">{t('all_blocks')}</option>
            {blocks.map((block) => (
              <option key={block} value={block}>
                {t('block')} {block}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="ALL">{t('all_status')}</option>
            <option value="OCCUPIED">{t('occupied')}</option>
            <option value="VACANT">{t('vacant')}</option>
          </select>
        </div>

        <div className="mt-4 pt-4 border-t-2 border-gray-100">
          <span className="text-sm text-gray-600">
            {t('showing_count', { filtered: filteredHouses.length, total: houses.length })}
          </span>
        </div>
      </div>

      {/* Houses Table */}
      <Table
        data={paginatedData}
        columns={columns}
        keyExtractor={(house) => house.id}
        emptyMessage={t('no_houses_found')}
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
        title={t('delete_house')}
        message={t('delete_confirmation', { houseNumber: houseToDelete?.houseNumber ?? '' })}
        confirmText={tCommon('actions.delete')}
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Import Modal */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title={t('import_houses')}
        size="lg"
      >
        <ImportHousesForm
          onSuccess={() => {
            fetchData();
            setImportModalOpen(false);
            setSuccessMessage(t('import_success'));
          }}
          onClose={() => setImportModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
