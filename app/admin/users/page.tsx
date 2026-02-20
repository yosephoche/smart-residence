"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Table, { Column, Pagination } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { ConfirmModal } from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import { formatDate } from "@/lib/utils";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = 'force-dynamic';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isFirstLogin: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const t = useTranslations('users');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchUsers = async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    let filtered = users;
    if (roleFilter !== "ALL") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [users, searchQuery, roleFilter]);

  // Pagination
  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredUsers, {
    initialPageSize: 25,
    resetDeps: [searchQuery, roleFilter],
  });

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        // Deletion failed - show actual error
        setErrorMessage(data.error || "Failed to delete user");
        setTimeout(() => setErrorMessage(""), 8000); // Longer timeout for error messages
        setIsDeleting(false);
        setDeleteModalOpen(false);
        return; // Don't refresh user list or show success
      }

      // Deletion succeeded
      setSuccessMessage(`User "${userToDelete.name}" has been deleted successfully`);
      setTimeout(() => setSuccessMessage(""), 5000);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers(); // Refresh the list
    } catch (error) {
      setErrorMessage("Network error - could not delete user");
      setTimeout(() => setErrorMessage(""), 8000);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<User>[] = [
    {
      key: "name",
      header: tCommon('table.name'),
      sortable: true,
      render: (_, user) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-primary-700 font-semibold text-sm">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: tCommon('table.role'),
      sortable: true,
      render: (value) => (
        <Badge variant={value === "ADMIN" ? "info" : "default"}>
          {value}
        </Badge>
      ),
    },
    {
      key: "isFirstLogin",
      header: tCommon('table.status'),
      render: (value) =>
        value ? (
          <Badge variant="warning" size="sm">{tCommon('status.first_login')}</Badge>
        ) : (
          <Badge variant="success" size="sm">{tCommon('status.active')}</Badge>
        ),
    },
    {
      key: "createdAt",
      header: tCommon('table.created'),
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDate(value)}</span>
      ),
    },
    {
      key: "id",
      header: tCommon('table.actions'),
      render: (_, user) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/users/${user.id}/edit`)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {tCommon('actions.edit')}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(user)} className="text-danger-600 hover:bg-danger-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {tCommon('actions.delete')}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-12 w-36" />
        </div>
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <Link href="/admin/users/create">
          <Button variant="primary" size="lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('add_user')}
          </Button>
        </Link>
      </div>

      {successMessage && <Alert variant="success" message={successMessage} autoClose />}
      {errorMessage && <Alert variant="error" message={errorMessage} autoClose />}

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
          <div className="w-full md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
            >
              <option value="ALL">{t('all_roles')}</option>
              <option value="ADMIN">{t('role_admin')}</option>
              <option value="USER">{t('role_user')}</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t-2 border-gray-100">
          <span className="text-sm text-gray-600">
            {tCommon('table.showing')} <span className="font-semibold">{filteredUsers.length}</span> {tCommon('table.of')}{" "}
            <span className="font-semibold">{users.length}</span> {t('showing_users')}
          </span>
        </div>
      </div>

      <Table data={paginatedData} columns={columns} keyExtractor={(user) => user.id} emptyMessage={t('no_users_found')} />

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

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t('delete_user')}
        message={t('delete_confirmation', { name: userToDelete?.name ?? '' })}
        confirmText={tCommon('actions.delete')}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
