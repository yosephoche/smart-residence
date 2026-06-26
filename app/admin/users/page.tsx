"use client";

import { motion } from "framer-motion";

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
import { useDebounce } from "@/lib/hooks/useDebounce";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = 'force-dynamic';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isFirstLogin: boolean;
  isPengurus: boolean;
  createdAt: string;
  houses?: Array<{
    id: string;
    houseNumber: string;
    block: string;
    houseType?: { typeName: string };
  }>;
}

export default function UsersPage() {
  const t = useTranslations('users');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "ADMIN" | "USER">("ALL");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
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
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [users, debouncedSearch, roleFilter]);

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
    resetDeps: [debouncedSearch, roleFilter],
  });

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  const handleTogglePengurus = async (user: User) => {
    const newValue = !user.isPengurus;
    try {
      const res = await fetch(`/api/users/${user.id}/pengurus`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPengurus: newValue }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || "Gagal mengubah status pengurus");
        setTimeout(() => setErrorMessage(""), 5000);
        return;
      }
      setSuccessMessage(
        newValue
          ? `"${user.name}" ditandai sebagai Pengurus`
          : `"${user.name}" dihapus dari daftar Pengurus`
      );
      setTimeout(() => setSuccessMessage(""), 4000);
      fetchUsers();
    } catch {
      setErrorMessage("Network error - gagal mengubah status pengurus");
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const handleResetPasswordClick = (user: User) => {
    setUserToReset(user);
    setResetPasswordModalOpen(true);
  };

  const handleResetPasswordConfirm = async () => {
    if (!userToReset) return;
    setIsResettingPassword(true);
    try {
      const res = await fetch(`/api/users/${userToReset.id}/reset-password`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Gagal reset password");
        setTimeout(() => setErrorMessage(""), 8000);
      } else {
        setSuccessMessage(`Password "${userToReset.name}" berhasil direset ke password default`);
        setTimeout(() => setSuccessMessage(""), 5000);
        fetchUsers();
      }
    } catch {
      setErrorMessage("Network error - gagal reset password");
      setTimeout(() => setErrorMessage(""), 8000);
    } finally {
      setIsResettingPassword(false);
      setResetPasswordModalOpen(false);
      setUserToReset(null);
    }
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
            <p className="font-medium text-slate-900">{user.name}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
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
      key: "houses",
      header: "Rumah",
      render: (_, user) => {
        if (!user.houses || user.houses.length === 0) {
          return <span className="text-xs text-slate-400">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {user.houses.map((h) => (
              <span key={h.id} className="inline-flex items-center text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 font-medium">
                {h.block}-{h.houseNumber}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "isFirstLogin",
      header: tCommon('table.status'),
      render: (value, user) => (
        <div className="flex flex-col gap-1">
          {value ? (
            <Badge variant="warning" size="sm">{tCommon('status.first_login')}</Badge>
          ) : (
            <Badge variant="success" size="sm">{tCommon('status.active')}</Badge>
          )}
          {user.isPengurus && (
            <Badge variant="info" size="sm">Pengurus</Badge>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: tCommon('table.created'),
      sortable: true,
      render: (value) => (
        <span className="text-sm text-slate-600">{formatDate(value)}</span>
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
          <Button variant="ghost" size="sm" onClick={() => handleResetPasswordClick(user)} className="text-amber-600 hover:bg-amber-50">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Reset Password
          </Button>
          {user.role === "USER" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleTogglePengurus(user)}
              className={user.isPengurus ? "text-blue-600 hover:bg-blue-50" : "text-slate-500 hover:bg-slate-50"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              {user.isPengurus ? "Cabut Pengurus" : "Jadikan Pengurus"}
            </Button>
          )}
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
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{t('title')}</h1>
          <p className="text-slate-600 mt-1">{t('subtitle')}</p>
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={t('search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  searchQuery !== ""
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              />
            </div>
            {/* Role filter */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start">
              {[
                { value: "ALL", label: t('all_roles') },
                { value: "ADMIN", label: t('role_admin') },
                { value: "USER", label: t('role_user') },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRoleFilter(opt.value as any)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    roleFilter === opt.value
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{tCommon('table.showing')}</span>
          <span className="font-semibold text-slate-800">{filteredUsers.length}</span>
          <span>{tCommon('table.of')}</span>
          <span className="font-semibold text-slate-800">{users.length}</span>
          <span>{t('showing_users')}</span>
          {(searchQuery !== "" || roleFilter !== "ALL") && (
            <button
              onClick={() => { setSearchQuery(""); setRoleFilter("ALL"); }}
              className="ml-auto text-xs text-slate-400 hover:text-red-500 underline underline-offset-2 transition-colors"
            >
              {tCommon('actions.reset') || 'Reset'}
            </button>
          )}
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

      <ConfirmModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        onConfirm={handleResetPasswordConfirm}
        title="Reset Password"
        message={`Reset password "${userToReset?.name ?? ''}" ke password default? User akan diminta untuk mengganti password saat login berikutnya.`}
        confirmText="Reset Password"
        variant="danger"
        isLoading={isResettingPassword}
      />
    </motion.div>
  );
}