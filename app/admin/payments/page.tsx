"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Table, { Column, Pagination } from "@/components/ui/Table";
import PaymentStatusBadge from "@/components/payments/PaymentStatusBadge";
import { Skeleton } from "@/components/ui/Loading";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPaymentMonthShort } from "@/lib/calculations";
import Button from "@/components/ui/Button";
import Modal, { ConfirmModal } from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import AdminCreatePaymentForm from "@/components/forms/AdminCreatePaymentForm";
import { exportCSV, exportXLSX, mapPaymentsForExport, mapHousesWithStatusForExport } from "@/lib/utils/export";
import { usePagination } from "@/lib/hooks/usePagination";
import { ImageModal } from "@/components/ui/ImageModal";

interface Payment {
  id: string;
  userId: string;
  houseId: string;
  amountMonths: number;
  totalAmount: number;
  proofImagePath: string;
  status: string;
  createdAt: string;
  user?: { id: string; name: string; email: string };
  house?: { id: string; houseNumber: string; block?: string; houseType?: { typeName: string } };
  paymentMonths?: Array<{ year: number; month: number }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AnnotatedHouse {
  id: string;
  houseNumber: string;
  block: string;
  user?: { id: string; name: string; email: string } | null;
  houseType?: { typeName: string; price: unknown } | null;
  paymentStatus: "PENDING" | "APPROVED" | null;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  // Resident & month/year filters
  const [filterUserId, setFilterUserId] = useState("");
  const [filterYear, setFilterYear] = useState(0);
  const [filterMonth, setFilterMonth] = useState(0);

  // Houses view (Paid / Unpaid pills)
  const [housesViewMode, setHousesViewMode] = useState<"PAID" | "UNPAID" | null>(null);
  const [allHousesWithStatus, setAllHousesWithStatus] = useState<AnnotatedHouse[]>([]);
  const lastFetchedKey = useRef<string>("");

  // Create payment modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Export dropdown
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Bulk approval and image preview
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Initial fetch: payments + users in parallel
  useEffect(() => {
    Promise.all([
      fetch("/api/payments").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([paymentsData, usersData]) => {
      setPayments(paymentsData);
      setUsers(usersData);
      setIsLoading(false);
    });
  }, []);

  // Fetch house-status when entering houses view or changing month/year
  useEffect(() => {
    if (housesViewMode === null) return;
    if (filterYear === 0 || filterMonth === 0) return;

    const key = `${filterYear}-${filterMonth}`;
    if (key === lastFetchedKey.current) return; // Paid ↔ Unpaid toggle: no re-fetch
    lastFetchedKey.current = key;

    fetch(`/api/payments/house-status?year=${filterYear}&month=${filterMonth}`)
      .then((r) => r.json())
      .then((data) => setAllHousesWithStatus(data));
  }, [housesViewMode, filterYear, filterMonth]);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Reset selections when filters change
  useEffect(() => {
    setSelectedPaymentIds([]);
  }, [statusFilter, filterUserId, filterYear, filterMonth]);

  const refetchPayments = () => {
    const fetches: Promise<any>[] = [
      fetch("/api/payments").then((r) => r.json()),
    ];
    if (housesViewMode !== null && filterYear !== 0 && filterMonth !== 0) {
      lastFetchedKey.current = ""; // force re-fetch on next effect tick
      fetches.push(
        fetch(`/api/payments/house-status?year=${filterYear}&month=${filterMonth}`).then((r) => r.json())
      );
    }
    Promise.all(fetches).then(([paymentsData, housesData]) => {
      setPayments(paymentsData);
      if (housesData) setAllHousesWithStatus(housesData);
    });
  };

  const INDONESIAN_MONTHS = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember",
  ];

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    payments.forEach((p) =>
      p.paymentMonths?.forEach((pm) => years.add(pm.year))
    );
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => a - b);
  }, [payments]);

  const filteredPayments = useMemo(() => {
    let result = payments;
    // 1. Status
    if (statusFilter !== "ALL") {
      result = result.filter((p) => p.status === statusFilter);
    }
    // 2. Resident
    if (filterUserId !== "") {
      result = result.filter((p) => p.userId === filterUserId);
    }
    // 3. Month + Year (both must be set)
    if (filterYear !== 0 && filterMonth !== 0) {
      result = result.filter((p) =>
        p.paymentMonths?.some((pm) => pm.year === filterYear && pm.month === filterMonth)
      );
    }
    return result;
  }, [payments, statusFilter, filterUserId, filterYear, filterMonth]);

  // Houses view: filter by resident then split by paid/unpaid
  const displayedHouses = useMemo(() => {
    let list = allHousesWithStatus;
    if (filterUserId !== "") {
      list = list.filter((h) => h.user?.id === filterUserId);
    }
    if (housesViewMode === "PAID")   list = list.filter((h) => h.paymentStatus !== null);
    if (housesViewMode === "UNPAID") list = list.filter((h) => h.paymentStatus === null);
    return list;
  }, [allHousesWithStatus, housesViewMode, filterUserId]);

  // Pagination for payments table
  const {
    paginatedData: paginatedPayments,
    currentPage: paymentsPage,
    totalPages: paymentsTotalPages,
    pageSize: paymentsPageSize,
    totalItems: paymentsTotalItems,
    handlePageChange: handlePaymentsPageChange,
    handlePageSizeChange: handlePaymentsPageSizeChange,
  } = usePagination(filteredPayments, {
    initialPageSize: 25,
    resetDeps: [statusFilter, filterUserId, filterYear, filterMonth],
  });

  // Pagination for houses table
  const {
    paginatedData: paginatedHouses,
    currentPage: housesPage,
    totalPages: housesTotalPages,
    pageSize: housesPageSize,
    totalItems: housesTotalItems,
    handlePageChange: handleHousesPageChange,
    handlePageSizeChange: handleHousesPageSizeChange,
  } = usePagination(displayedHouses, {
    initialPageSize: 25,
    resetDeps: [housesViewMode, filterUserId, filterYear, filterMonth],
  });

  // Counts for pill badges — global (before resident filter)
  const paidCount   = useMemo(() => allHousesWithStatus.filter((h) => h.paymentStatus !== null).length, [allHousesWithStatus]);
  const unpaidCount = useMemo(() => allHousesWithStatus.filter((h) => h.paymentStatus === null).length, [allHousesWithStatus]);

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === "PENDING").length,
    approved: payments.filter((p) => p.status === "APPROVED").length,
    rejected: payments.filter((p) => p.status === "REJECTED").length,
    totalRevenue: payments
      .filter((p) => p.status === "APPROVED")
      .reduce((sum, p) => sum + Number(p.totalAmount), 0),
  };

  // --- Handlers ---
  const handleStatusFilter = (value: "ALL" | "PENDING" | "APPROVED" | "REJECTED") => {
    setStatusFilter(value);
    setHousesViewMode(null);
  };

  const enterHousesMode = (mode: "PAID" | "UNPAID") => {
    if (housesViewMode === mode) return;
    const now = new Date();
    if (filterMonth === 0) setFilterMonth(now.getMonth() + 1);
    if (filterYear  === 0) setFilterYear(now.getFullYear());
    setHousesViewMode(mode);
    setStatusFilter("ALL");
  };

  const handleCreatePayment = async (formData: FormData) => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/payments/admin-create", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to create payment");
        setIsCreating(false);
        return;
      }
      setIsCreating(false);
      setCreateModalOpen(false);
      setSuccessMessage("Payment created successfully and is now pending approval.");
      refetchPayments();
    } catch {
      setIsCreating(false);
      alert("An error occurred. Please try again.");
    }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    setShowExportDropdown(false);
    if (housesViewMode !== null) {
      const { headers, rows } = mapHousesWithStatusForExport(displayedHouses);
      const filename = `${housesViewMode.toLowerCase()}-houses-${filterYear}-${filterMonth}.${format}`;
      if (format === "csv") {
        exportCSV(filename, headers, rows);
      } else {
        await exportXLSX(filename, headers, rows);
      }
    } else {
      const { headers, rows } = mapPaymentsForExport(filteredPayments);
      const filename = `payments.${format}`;
      if (format === "csv") {
        exportCSV(filename, headers, rows);
      } else {
        await exportXLSX(filename, headers, rows);
      }
    }
  };

  const handleImageClick = (imagePath: string) => {
    setSelectedImage(imagePath);
    setImageModalOpen(true);
  };

  const handleBulkApprove = async () => {
    setIsBulkProcessing(true);
    try {
      const res = await fetch("/api/payments/bulk-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentIds: selectedPaymentIds }),
      });

      if (!res.ok) throw new Error("Bulk approve failed");

      const result = await res.json();

      if (result.succeeded.length > 0) {
        setSuccessMessage(`Successfully approved ${result.succeeded.length} payment(s)`);
        setSelectedPaymentIds([]);
        refetchPayments();
      }

      if (result.failed.length > 0) {
        alert(`Failed to approve ${result.failed.length} payment(s). Check details.`);
      }
    } catch (error) {
      alert("Failed to approve payments. Please try again.");
    } finally {
      setIsBulkProcessing(false);
      setBulkApproveModalOpen(false);
    }
  };

  const handleSelectAll = () => {
    const pendingIds = paginatedPayments
      .filter((p) => p.status === "PENDING")
      .map((p) => p.id);

    if (selectedPaymentIds.length === pendingIds.length) {
      setSelectedPaymentIds([]);
    } else {
      setSelectedPaymentIds(pendingIds);
    }
  };

  const handleToggleSelect = (paymentId: string) => {
    setSelectedPaymentIds((prev) =>
      prev.includes(paymentId)
        ? prev.filter((id) => id !== paymentId)
        : [...prev, paymentId]
    );
  };

  // --- Payment table columns ---
  const paymentColumns: Column<Payment>[] = [
    {
      key: "select" as any,
      header: (
        <input
          type="checkbox"
          checked={
            selectedPaymentIds.length > 0 &&
            selectedPaymentIds.length === paginatedPayments.filter((p) => p.status === "PENDING").length
          }
          onChange={handleSelectAll}
          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
        />
      ) as any,
      render: (_, payment) => (
        <input
          type="checkbox"
          checked={selectedPaymentIds.includes(payment.id)}
          onChange={() => handleToggleSelect(payment.id)}
          disabled={payment.status !== "PENDING"}
          className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 disabled:opacity-30 disabled:cursor-not-allowed"
        />
      ),
    },
    {
      key: "userId",
      header: "Resident",
      render: (_, payment) => {
        const user = payment.user;
        return user ? (
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
        ) : (
          <span className="text-gray-400">Unknown</span>
        );
      },
    },
    {
      key: "houseId",
      header: "House",
      render: (_, payment) => {
        const house = payment.house;
        return house ? (
          <div>
            <p className="font-semibold text-gray-900">{house.houseNumber}</p>
            <p className="text-xs text-gray-500">{house.houseType?.typeName}</p>
          </div>
        ) : (
          <span className="text-gray-400">Unknown</span>
        );
      },
    },
    {
      key: "amountMonths",
      header: "Period & Amount",
      render: (_, payment) => {
        const isMonthFiltered = filterMonth !== 0 && filterYear !== 0;

        let displayAmount: number;
        let periodLabel: string;

        if (isMonthFiltered) {
          displayAmount = Number(payment.totalAmount) / payment.amountMonths;
          periodLabel = `${INDONESIAN_MONTHS[filterMonth - 1]} ${filterYear}`;
        } else {
          displayAmount = Number(payment.totalAmount);
          const hasMonths = payment.paymentMonths && payment.paymentMonths.length > 0;
          if (hasMonths) {
            const months = payment.paymentMonths!;
            const lastMonth = months[months.length - 1];
            const shortNames = months.map((m) => formatPaymentMonthShort(m));
            periodLabel = `${shortNames.join(", ")} ${lastMonth.year}`;
          } else {
            periodLabel = `${payment.amountMonths} month${payment.amountMonths !== 1 ? "s" : ""}`;
          }
        }

        return (
          <div>
            <p className="font-semibold text-gray-900">
              {formatCurrency(displayAmount)}
            </p>
            <p className="text-xs text-gray-500">{periodLabel}</p>
          </div>
        );
      },
    },
    {
      key: "createdAt",
      header: "Submitted",
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDate(value)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (status) => <PaymentStatusBadge status={status as any} />,
    },
    {
      key: "proofImagePath",
      header: "Proof",
      render: (_, payment) => (
        <button
          onClick={() => handleImageClick(payment.proofImagePath)}
          className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary-400 transition-all group"
        >
          <Image
            src={payment.proofImagePath}
            alt="Payment proof thumbnail"
            fill
            className="object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </button>
      ),
    },
    {
      key: "id",
      header: "Actions",
      render: (_, payment) => (
        <Link href={`/admin/payments/${payment.id}`}>
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
        </Link>
      ),
    },
  ];

  // --- Houses table columns (Paid / Unpaid view) ---
  const housesColumns: Column<AnnotatedHouse>[] = [
    {
      key: "user",
      header: "Resident",
      render: (_, house) => {
        const user = house.user;
        return user ? (
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
        ) : (
          <span className="text-gray-400">—</span>
        );
      },
    },
    {
      key: "houseNumber",
      header: "House",
      render: (_, house) => (
        <div>
          <p className="font-semibold text-gray-900">{house.houseNumber}</p>
          <p className="text-xs text-gray-500">Block {house.block}</p>
        </div>
      ),
    },
    {
      key: "houseType",
      header: "Type & Rate",
      render: (_, house) => (
        <div>
          <p className="font-medium text-gray-900">{house.houseType?.typeName ?? "—"}</p>
          <p className="text-xs text-gray-500">
            {house.houseType?.price != null ? formatCurrency(Number(house.houseType.price)) : "—"}/bulan
          </p>
        </div>
      ),
    },
    {
      key: "paymentStatus",
      header: "Status",
      render: (_, house) => {
        if (house.paymentStatus === null) {
          return <Badge variant="warning" dot>Belum Bayar</Badge>;
        }
        return <PaymentStatusBadge status={house.paymentStatus as any} showDot />;
      },
    },
  ];

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success alert */}
      {successMessage && (
        <Alert
          variant="success"
          title="Success"
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
          autoClose
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Management</h1>
          <p className="text-gray-600 mt-1">Review and approve resident payment submissions</p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setCreateModalOpen(true)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Payment
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-1">Total Payments</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-warning-50 rounded-xl border-2 border-warning-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-warning-700 mb-1">Pending</p>
          <p className="text-3xl font-bold text-warning-900">{stats.pending}</p>
        </div>
        <div className="bg-success-50 rounded-xl border-2 border-success-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-success-700 mb-1">Approved</p>
          <p className="text-3xl font-bold text-success-900">{stats.approved}</p>
        </div>
        <div className="bg-danger-50 rounded-xl border-2 border-danger-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-danger-700 mb-1">Rejected</p>
          <p className="text-3xl font-bold text-danger-900">{stats.rejected}</p>
        </div>
        <div className="bg-primary-50 rounded-xl border-2 border-primary-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-primary-700 mb-1">Total Revenue</p>
          <p className="text-xl font-bold text-primary-900">{formatCurrency(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* Filter bar + Export */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: "ALL" as const, label: "All Payments", count: stats.total },
              { value: "PENDING" as const, label: "Pending Review", count: stats.pending },
              { value: "APPROVED" as const, label: "Approved", count: stats.approved },
              { value: "REJECTED" as const, label: "Rejected", count: stats.rejected },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={() => handleStatusFilter(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  housesViewMode === null && statusFilter === filter.value
                    ? "bg-primary-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className="ml-2 text-xs opacity-75">({filter.count})</span>
                )}
              </button>
            ))}

            {/* Paid / Unpaid pills — visually distinct group */}
            <div className="ml-3 flex gap-2">
              <button
                onClick={() => enterHousesMode("PAID")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  housesViewMode === "PAID"
                    ? "bg-success-600 text-white shadow-md"
                    : "text-success-700 bg-success-50 border border-success-300 hover:bg-success-100"
                }`}
              >
                Paid
                {allHousesWithStatus.length > 0 && (
                  <span className="ml-2 text-xs opacity-75">({paidCount})</span>
                )}
              </button>
              <button
                onClick={() => enterHousesMode("UNPAID")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  housesViewMode === "UNPAID"
                    ? "bg-warning-600 text-white shadow-md"
                    : "text-warning-700 bg-warning-50 border border-warning-300 hover:bg-warning-100"
                }`}
              >
                Unpaid
                {allHousesWithStatus.length > 0 && (
                  <span className="ml-2 text-xs opacity-75">({unpaidCount})</span>
                )}
              </button>
            </div>
          </div>

          {/* Export dropdown */}
          <div className="relative" ref={exportDropdownRef}>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 6.414l-3.293 3.293a1 1 0 01-1.414 0z" />
              </svg>
            </Button>
            {showExportDropdown && (
              <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg border-2 border-gray-200 shadow-lg z-10">
                <button
                  onClick={() => handleExport("csv")}
                  className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport("xlsx")}
                  className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  Export as XLSX
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resident & Month/Year filter row — always visible */}
        <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-gray-100">
          <select
            value={filterUserId}
            onChange={(e) => setFilterUserId(e.target.value)}
            className="min-w-[160px] px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none"
          >
            <option value="">Semua Penghuni</option>
            {users
              .filter((u) => u.role !== "admin")
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>

          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
            className="min-w-[160px] px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none"
          >
            {housesViewMode === null && <option value={0}>Semua Bulan</option>}
            {INDONESIAN_MONTHS.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
            className="min-w-[160px] px-4 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-100 focus:outline-none"
          >
            {housesViewMode === null && <option value={0}>Semua Tahun</option>}
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {housesViewMode === null
            ? (filterUserId !== "" || filterYear !== 0 || filterMonth !== 0) && (
                <button
                  onClick={() => {
                    setFilterUserId("");
                    setFilterYear(0);
                    setFilterMonth(0);
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2"
                >
                  Hapus filter
                </button>
              )
            : (filterUserId !== "" ||
                filterMonth !== new Date().getMonth() + 1 ||
                filterYear !== new Date().getFullYear()) && (
                <button
                  onClick={() => {
                    setFilterUserId("");
                    setFilterMonth(new Date().getMonth() + 1);
                    setFilterYear(new Date().getFullYear());
                    lastFetchedKey.current = ""; // force re-fetch for current month
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2"
                >
                  Hapus filter
                </button>
              )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedPaymentIds.length > 0 && (
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {selectedPaymentIds.length} payment{selectedPaymentIds.length > 1 ? "s" : ""} selected
              </p>
              <p className="text-sm text-gray-600">Ready for bulk approval</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setSelectedPaymentIds([])}>
              Clear Selection
            </Button>
            <Button variant="primary" onClick={() => setBulkApproveModalOpen(true)}>
              Approve Selected
            </Button>
          </div>
        </div>
      )}

      {/* Conditional table: houses view or payment list */}
      {housesViewMode !== null ? (
        <>
          <Table
            data={paginatedHouses}
            columns={housesColumns}
            keyExtractor={(h) => h.id}
            emptyMessage={housesViewMode === "PAID" ? "No paid houses for this month" : "All houses have paid for this month"}
          />
          {paginatedHouses.length > 0 && (
            <Pagination
              currentPage={housesPage}
              totalPages={housesTotalPages}
              onPageChange={handleHousesPageChange}
              pageSize={housesPageSize}
              onPageSizeChange={handleHousesPageSizeChange}
              totalItems={housesTotalItems}
            />
          )}
        </>
      ) : (
        <>
          <Table
            data={paginatedPayments}
            columns={paymentColumns}
            keyExtractor={(payment) => payment.id}
            emptyMessage={statusFilter === "ALL" ? "No payments yet" : `No ${statusFilter.toLowerCase()} payments`}
          />
          {paginatedPayments.length > 0 && (
            <Pagination
              currentPage={paymentsPage}
              totalPages={paymentsTotalPages}
              onPageChange={handlePaymentsPageChange}
              pageSize={paymentsPageSize}
              onPageSizeChange={handlePaymentsPageSizeChange}
              totalItems={paymentsTotalItems}
            />
          )}
        </>
      )}

      {/* Create Payment Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Payment"
        size="lg"
      >
        <AdminCreatePaymentForm
          users={users}
          onSubmit={handleCreatePayment}
          onCancel={() => setCreateModalOpen(false)}
          isSubmitting={isCreating}
        />
      </Modal>

      {/* Image Preview Modal */}
      <ImageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        imageSrc={selectedImage}
        altText="Payment proof"
      />

      {/* Bulk Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={bulkApproveModalOpen}
        onClose={() => setBulkApproveModalOpen(false)}
        title="Approve Multiple Payments"
        message={`Are you sure you want to approve ${selectedPaymentIds.length} payment(s)? This action cannot be undone.`}
        confirmText="Approve All"
        cancelText="Cancel"
        onConfirm={handleBulkApprove}
        isLoading={isBulkProcessing}
        variant="primary"
      />
    </div>
  );
}
