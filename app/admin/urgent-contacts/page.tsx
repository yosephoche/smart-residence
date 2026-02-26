"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Table, { Column, Pagination } from "@/components/ui/Table";
import { ConfirmModal } from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = "force-dynamic";

interface UrgentContact {
  id: string;
  name: string;
  serviceType: string;
  phone: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  creator?: { id: string; name: string };
}

interface ContactFormData {
  name: string;
  serviceType: string;
  phone: string;
  order: number;
  isActive: boolean;
}

const emptyForm: ContactFormData = {
  name: "",
  serviceType: "",
  phone: "",
  order: 0,
  isActive: true,
};

export default function UrgentContactsPage() {
  const tCommon = useTranslations("common");
  const [contacts, setContacts] = useState<UrgentContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<UrgentContact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<UrgentContact | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Alerts
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/urgent-contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data);
      }
    } catch {
      // silently handle
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.serviceType.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [contacts, searchQuery]);

  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(filteredContacts, {
    initialPageSize: 25,
    resetDeps: [searchQuery],
  });

  const openCreateModal = () => {
    setEditingContact(null);
    setFormData(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (contact: UrgentContact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      serviceType: contact.serviceType,
      phone: contact.phone,
      order: contact.order,
      isActive: contact.isActive,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.serviceType.trim() || !formData.phone.trim()) {
      setErrorMessage("Nama, tipe layanan, dan nomor WhatsApp wajib diisi");
      setTimeout(() => setErrorMessage(""), 5000);
      return;
    }

    setIsSaving(true);
    try {
      const url = editingContact
        ? `/api/urgent-contacts/${editingContact.id}`
        : "/api/urgent-contacts";
      const method = editingContact ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccessMessage(
          editingContact ? "Kontak berhasil diperbarui" : "Kontak berhasil ditambahkan"
        );
        setTimeout(() => setSuccessMessage(""), 5000);
        setModalOpen(false);
        await fetchContacts();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Gagal menyimpan kontak");
        setTimeout(() => setErrorMessage(""), 5000);
      }
    } catch {
      setErrorMessage("Terjadi kesalahan jaringan");
      setTimeout(() => setErrorMessage(""), 5000);
    }
    setIsSaving(false);
  };

  const handleDeleteClick = (contact: UrgentContact) => {
    setContactToDelete(contact);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);

    const res = await fetch(`/api/urgent-contacts/${contactToDelete.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setSuccessMessage(`Kontak "${contactToDelete.name}" berhasil dihapus`);
      setTimeout(() => setSuccessMessage(""), 5000);
      await fetchContacts();
    } else {
      const err = await res.json();
      setErrorMessage(err.error || "Gagal menghapus kontak");
      setTimeout(() => setErrorMessage(""), 5000);
    }

    setIsDeleting(false);
    setDeleteModalOpen(false);
    setContactToDelete(null);
  };

  const formatPhone = (phone: string) => {
    // Display in readable format
    if (phone.startsWith("62")) return `+${phone}`;
    return phone;
  };

  const buildWaLink = (phone: string) => {
    const clean = phone.replace(/\D/g, "");
    return `https://wa.me/${clean}`;
  };

  const columns: Column<UrgentContact>[] = [
    {
      key: "order",
      header: "Urutan",
      render: (order) => (
        <span className="text-sm font-medium text-gray-600">{order}</span>
      ),
    },
    {
      key: "serviceType",
      header: "Tipe Layanan",
      render: (serviceType) => (
        <span className="text-sm font-medium text-gray-800">{serviceType}</span>
      ),
    },
    {
      key: "name",
      header: "Nama Kontak",
      render: (name) => (
        <span className="text-sm font-semibold text-gray-900">{name}</span>
      ),
    },
    {
      key: "phone",
      header: "Nomor WhatsApp",
      render: (phone) => (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 font-mono">{formatPhone(phone)}</span>
          <a
            href={buildWaLink(phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-600 hover:text-green-700 text-xs font-medium underline"
          >
            Test WA
          </a>
        </div>
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (isActive) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isActive
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {isActive ? "Aktif" : "Nonaktif"}
        </span>
      ),
    },
    {
      key: "actions",
      header: tCommon("table.actions"),
      render: (_, contact) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditModal(contact)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {tCommon("actions.edit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(contact)}
            className="text-danger-600 hover:bg-danger-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {tCommon("actions.delete")}
          </Button>
        </div>
      ),
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
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const activeCount = contacts.filter((c) => c.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Kontak Darurat
          </h1>
          <p className="text-gray-600 mt-1">
            Kelola kontak darurat dan layanan yang ditampilkan kepada penghuni
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={openCreateModal}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Kontak
        </Button>
      </div>

      {/* Alerts */}
      {successMessage && (
        <Alert variant="success" message={successMessage} autoClose />
      )}
      {errorMessage && (
        <Alert variant="error" message={errorMessage} onClose={() => setErrorMessage("")} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600">Total Kontak</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{contacts.length}</p>
        </div>
        <div className="bg-success-50 rounded-xl border-2 border-success-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-success-700">Kontak Aktif</p>
          <p className="text-3xl font-bold text-success-900 mt-1">{activeCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
        <Input
          placeholder="Cari berdasarkan nama, tipe layanan, atau nomor..."
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
            Menampilkan {filteredContacts.length} dari {contacts.length} kontak
          </span>
        </div>
      </div>

      {/* Table */}
      <Table
        data={paginatedData}
        columns={columns}
        keyExtractor={(c) => c.id}
        emptyMessage="Belum ada kontak darurat. Klik 'Tambah Kontak' untuk mulai."
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingContact ? "Edit Kontak" : "Tambah Kontak Darurat"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipe Layanan <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.serviceType}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, serviceType: e.target.value }))
                  }
                  placeholder="Contoh: Service AC, Listrik, Plumbing"
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Kontak <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Contoh: Pak Budi"
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor WhatsApp <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  fullWidth
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format Indonesia: 08xxx atau 628xxx
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urutan Tampil
                </label>
                <Input
                  type="number"
                  value={String(formData.order)}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      order: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder="0"
                  fullWidth
                />
                <p className="text-xs text-gray-500 mt-1">
                  Angka lebih kecil muncul lebih dulu
                </p>
              </div>
              {editingContact && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-700"
                  >
                    Kontak Aktif (ditampilkan kepada penghuni)
                  </label>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Menyimpan..." : editingContact ? "Simpan Perubahan" : "Tambah Kontak"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Kontak"
        message={`Apakah Anda yakin ingin menghapus kontak "${contactToDelete?.name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText={tCommon("actions.delete")}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
