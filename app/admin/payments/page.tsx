"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
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
import BulkCreatePaymentForm from "@/components/forms/BulkCreatePaymentForm";
import { exportCSV, exportXLSX, mapPaymentsForExport, mapHousesWithStatusForExport } from "@/lib/utils/export";
import { usePagination } from "@/lib/hooks/usePagination";
import { ImageModal } from "@/components/ui/ImageModal";

export const dynamic = 'force-dynamic';

interface Payment {
  id: string;
  userId: string;
  houseId: string;
  amountMonths: number;
  totalAmount: number;
  proofImagePath: string | null;
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
  const t = useTranslations('payments.admin');
  const tCommon = useTranslations('common');
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

  // Bulk create modal
  const [bulkCreateModalOpen, setBulkCreateModalOpen] = useState(false);
  const [bulkCreateResult, setBulkCreateResult] = useState<{
    succeeded: any[];
    failed: { houseId: string; reason: string }[];
  } | null>(null);

  // Export dropdown
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Bulk approval and image preview
  const [selectedPaymentIds, setSelectedPaymentIds] = useState<string[]>([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [bulkApproveModalOpen, setBulkApproveModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Feature: Date filter
  const [filterDate, setFilterDate] = useState<string>("");

  // Feature: WhatsApp modal
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappTab, setWhatsappTab] = useState<"today" | "unpaid">("today");
  const [whatsappTodayMsg, setWhatsappTodayMsg] = useState("");
  const [whatsappUnpaidMsg, setWhatsappUnpaidMsg] = useState("");
  const [isCopiedToday, setIsCopiedToday] = useState(false);
  const [isCopiedUnpaid, setIsCopiedUnpaid] = useState(false);
  const [isLoadingWA, setIsLoadingWA] = useState(false);

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

  const INDONESIAN_DAYS = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

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
    // 4. Date (WITA UTC+8)
    if (filterDate !== "") {
      result = result.filter((p) => {
        const witaDate = new Date(
          new Date(p.createdAt).getTime() + 8 * 60 * 60 * 1000
        ).toISOString().slice(0, 10);
        return witaDate === filterDate;
      });
    }
    return result;
  }, [payments, statusFilter, filterUserId, filterYear, filterMonth, filterDate]);

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
    resetDeps: [statusFilter, filterUserId, filterYear, filterMonth, filterDate],
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

  const stats = useMemo(() => ({
    total: payments.length,
    pending: payments.filter((p) => p.status === "PENDING").length,
    approved: payments.filter((p) => p.status === "APPROVED").length,
    rejected: payments.filter((p) => p.status === "REJECTED").length,
    totalRevenue: payments
      .filter((p) => p.status === "APPROVED")
      .reduce((sum, p) => sum + Number(p.totalAmount), 0),
  }), [payments]);

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
        toast.error(err.error || t('create_payment_error'));
        setIsCreating(false);
        return;
      }
      setIsCreating(false);
      setCreateModalOpen(false);
      setSuccessMessage(t('payment_created_success'));
      refetchPayments();
    } catch {
      setIsCreating(false);
      toast.error(t('generic_error'));
    }
  };

  const handleBulkCreateSuccess = (result: { succeeded: any[]; failed: { houseId: string; reason: string }[] }) => {
    setBulkCreateModalOpen(false);
    setBulkCreateResult(result);
    if (result.succeeded.length > 0) {
      setSuccessMessage(
        `${result.succeeded.length} pembayaran berhasil dibuat sebagai Disetujui.${
          result.failed.length > 0 ? ` ${result.failed.length} gagal.` : ""
        }`
      );
      refetchPayments();
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
        setSuccessMessage(t('bulk_approve_success', { count: result.succeeded.length }));
        setSelectedPaymentIds([]);
        refetchPayments();
      }

      if (result.failed.length > 0) {
        toast.error(t('bulk_approve_partial_error', { count: result.failed.length }));
      }
    } catch (error) {
      toast.error(t('bulk_approve_error'));
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

  // --- WhatsApp message generator ---
  const buildWhatsappMessages = async () => {
    setIsLoadingWA(true);
    const nowWib = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const todayWibStr = nowWib.toISOString().slice(0, 10);
    const dateLabel = `${INDONESIAN_DAYS[nowWib.getUTCDay()]}, ${nowWib.getUTCDate()} ${INDONESIAN_MONTHS[nowWib.getUTCMonth()]} ${nowWib.getUTCFullYear()}`;

    // Message 1: filter payments state for today (WITA)
    const todayPayments = payments.filter((p) =>
      new Date(new Date(p.createdAt).getTime() + 8 * 60 * 60 * 1000)
        .toISOString().slice(0, 10) === todayWibStr
    );
    let msg1 = `🏠 *Laporan Pembayaran IPL*\n📅 Hari ini: ${dateLabel}\n\n`;
    if (todayPayments.length === 0) {
      msg1 += `Belum ada pembayaran masuk hari ini.`;
    } else {
      msg1 += `✅ *Pembayaran Masuk (${todayPayments.length} transaksi):*\n\n`;
      todayPayments.forEach((p, i) => {
        msg1 += `${i + 1}. Blok ${p.house?.block ?? "—"} / No. ${p.house?.houseNumber ?? "—"} - ${p.user?.name ?? "—"} - ${formatCurrency(Number(p.totalAmount))}\n`;
      });
      const total = todayPayments.reduce((sum, p) => sum + Number(p.totalAmount), 0);
      msg1 += `\n💰 *Total Diterima: ${formatCurrency(total)}*`;
    }
    setWhatsappTodayMsg(msg1);

    // Message 2: fetch unpaid houses from existing endpoint
    try {
      const res = await fetch("/api/payments/unpaid-this-month");
      const unpaid: Array<{ block: string; houseNumber: string }> = await res.json();
      const periodLabel = `${INDONESIAN_MONTHS[nowWib.getUTCMonth()]} ${nowWib.getUTCFullYear()}`;
      let msg2 = `⚠️ *Tagihan IPL Belum Dibayar*\n📅 Periode: ${periodLabel}\n\n`;
      if (unpaid.length === 0) {
        msg2 += `Semua unit sudah membayar bulan ini! 🎉`;
      } else {
        msg2 += `🏠 *Daftar Unit Belum Bayar (${unpaid.length} unit):*\n\n`;
        unpaid.forEach((h, i) => {
          msg2 += `${i + 1}. Blok ${h.block} / No. ${h.houseNumber}\n`;
        });
        msg2 += `\nTotal *${unpaid.length} unit* belum bayar bulan ini.`;
      }
      setWhatsappUnpaidMsg(msg2);
    } catch {
      setWhatsappUnpaidMsg("Gagal memuat data unit belum bayar.");
    }
    setIsLoadingWA(false);
  };

  const openWhatsappModal = () => {
    setWhatsappModalOpen(true);
    setWhatsappTab("today");
    setIsCopiedToday(false);
    setIsCopiedUnpaid(false);
    buildWhatsappMessages();
  };

  const handleCopyWA = async (text: string, tab: "today" | "unpaid") => {
    await navigator.clipboard.writeText(text);
    if (tab === "today") {
      setIsCopiedToday(true);
      setTimeout(() => setIsCopiedToday(false), 2000);
    } else {
      setIsCopiedUnpaid(true);
      setTimeout(() => setIsCopiedUnpaid(false), 2000);
    }
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
      header: t('resident'),
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
          <span className="text-gray-400">{tCommon('unknown')}</span>
        );
      },
    },
    {
      key: "houseId",
      header: t('house'),
      render: (_, payment) => {
        const house = payment.house;
        return house ? (
          <div>
            <p className="font-semibold text-gray-900">{house.houseNumber}</p>
            <p className="text-xs text-gray-500">{house.houseType?.typeName}</p>
          </div>
        ) : (
          <span className="text-gray-400">{tCommon('unknown')}</span>
        );
      },
    },
    {
      key: "amountMonths",
      header: t('period_and_amount'),
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
            periodLabel = `${payment.amountMonths} ${payment.amountMonths !== 1 ? t('months') : t('month')}`;
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
      header: t('submitted'),
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600">{formatDate(value)}</span>
      ),
    },
    {
      key: "status",
      header: tCommon('table.status'),
      sortable: true,
      render: (status) => <PaymentStatusBadge status={status as any} />,
    },
    {
      key: "proofImagePath",
      header: t('proof'),
      render: (_, payment) => {
        if (!payment.proofImagePath) {
          return (
            <span className="text-xs text-gray-400 italic">—</span>
          );
        }
        return (
          <button
            onClick={() => handleImageClick(payment.proofImagePath!)}
            className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary-400 transition-all group"
          >
            <Image
              src={payment.proofImagePath}
              alt={t('payment_proof_thumbnail')}
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
        );
      },
    },
    {
      key: "id",
      header: tCommon('table.actions'),
      render: (_, payment) => (
        <Link href={`/admin/payments/${payment.id}`}>
          <button className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {t('view_details')}
          </button>
        </Link>
      ),
    },
  ];

  // --- Houses table columns (Paid / Unpaid view) ---
  const housesColumns: Column<AnnotatedHouse>[] = [
    {
      key: "user",
      header: t('resident'),
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
      header: t('house'),
      render: (_, house) => (
        <div>
          <p className="font-semibold text-gray-900">{house.houseNumber}</p>
          <p className="text-xs text-gray-500">{house.block}</p>
        </div>
      ),
    },
    {
      key: "houseType",
      header: t('type_and_rate'),
      render: (_, house) => (
        <div>
          <p className="font-medium text-gray-900">{house.houseType?.typeName ?? "—"}</p>
          <p className="text-xs text-gray-500">
            {house.houseType?.price != null ? formatCurrency(Number(house.houseType.price)) : "—"}{t('per_month')}
          </p>
        </div>
      ),
    },
    {
      key: "paymentStatus",
      header: tCommon('table.status'),
      render: (_, house) => {
        if (house.paymentStatus === null) {
          return <Badge variant="warning" dot>{t('unpaid')}</Badge>;
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
          title={t('success')}
          message={successMessage}
          onClose={() => setSuccessMessage(null)}
          autoClose
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('title')}</h1>
          <p className="text-gray-600 mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="lg" onClick={() => setBulkCreateModalOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Bulk Create
          </Button>
          <Button variant="primary" size="lg" onClick={() => setCreateModalOpen(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('create_payment')}
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-600 mb-1">{t('total_payments')}</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-warning-50 rounded-xl border-2 border-warning-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-warning-700 mb-1">{t('pending')}</p>
          <p className="text-3xl font-bold text-warning-900">{stats.pending}</p>
        </div>
        <div className="bg-success-50 rounded-xl border-2 border-success-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-success-700 mb-1">{t('approved')}</p>
          <p className="text-3xl font-bold text-success-900">{stats.approved}</p>
        </div>
        <div className="bg-danger-50 rounded-xl border-2 border-danger-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-danger-700 mb-1">{t('rejected')}</p>
          <p className="text-3xl font-bold text-danger-900">{stats.rejected}</p>
        </div>
        <div className="bg-primary-50 rounded-xl border-2 border-primary-200 p-4 shadow-sm">
          <p className="text-sm font-medium text-primary-700 mb-1">{t('total_revenue')}</p>
          <p className="text-xl font-bold text-primary-900">{formatCurrency(stats.totalRevenue)}</p>
        </div>
      </div>

      {/* Filter bar + Export */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: "ALL" as const, label: t('all_payments'), count: stats.total },
              { value: "PENDING" as const, label: t('pending_review'), count: stats.pending },
              { value: "APPROVED" as const, label: t('approved'), count: stats.approved },
              { value: "REJECTED" as const, label: t('rejected'), count: stats.rejected },
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
                {t('paid')}
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
                {t('unpaid')}
                {allHousesWithStatus.length > 0 && (
                  <span className="ml-2 text-xs opacity-75">({unpaidCount})</span>
                )}
              </button>
            </div>
          </div>

          {/* WhatsApp message generator */}
          <button
            onClick={openWhatsappModal}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </button>

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
              {t('export')}
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
                  {t('export_csv')}
                </button>
                <button
                  onClick={() => handleExport("xlsx")}
                  className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  {t('export_xlsx')}
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
            <option value="">{t('all_residents')}</option>
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
            {housesViewMode === null && <option value={0}>{t('all_months')}</option>}
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
            {housesViewMode === null && <option value={0}>{t('all_years')}</option>}
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Date filter — only when not in houses view */}
          {housesViewMode === null && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                max={new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)}
                className="px-3 py-2 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500"
              />
              <button
                onClick={() =>
                  setFilterDate(
                    new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
                  )
                }
                className="px-3 py-2 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 whitespace-nowrap"
              >
                Hari Ini
              </button>
              {filterDate !== "" && (
                <button
                  onClick={() => setFilterDate("")}
                  className="text-gray-400 hover:text-gray-600 flex items-center"
                  title="Hapus filter tanggal"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {housesViewMode === null
            ? (filterUserId !== "" || filterYear !== 0 || filterMonth !== 0 || filterDate !== "") && (
                <button
                  onClick={() => {
                    setFilterUserId("");
                    setFilterYear(0);
                    setFilterMonth(0);
                    setFilterDate("");
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 underline underline-offset-2"
                >
                  {t('clear_filter')}
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
                  {t('clear_filter')}
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
                {t('selected_count', { count: selectedPaymentIds.length })}
              </p>
              <p className="text-sm text-gray-600">{t('ready_bulk_approval')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => setSelectedPaymentIds([])}>
              {t('clear_selection')}
            </Button>
            <Button variant="primary" onClick={() => setBulkApproveModalOpen(true)}>
              {t('approve_selected')}
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
            emptyMessage={housesViewMode === "PAID" ? t('no_paid_houses') : t('all_paid')}
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
            emptyMessage={statusFilter === "ALL" ? t('no_payments_yet') : t('no_status_payments', { status: statusFilter.toLowerCase() })}
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
        title={t('create_payment')}
        size="lg"
      >
        <AdminCreatePaymentForm
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
        altText={t('payment_proof')}
      />

      {/* Bulk Create Payment Modal */}
      <Modal
        isOpen={bulkCreateModalOpen}
        onClose={() => setBulkCreateModalOpen(false)}
        title="Bulk Create Pembayaran"
        size="lg"
      >
        <BulkCreatePaymentForm
          users={users}
          onSuccess={handleBulkCreateSuccess}
          onCancel={() => setBulkCreateModalOpen(false)}
        />
      </Modal>

      {/* Bulk Create Result Modal */}
      {bulkCreateResult && (
        <Modal
          isOpen={!!bulkCreateResult}
          onClose={() => setBulkCreateResult(null)}
          title="Hasil Bulk Create"
          size="md"
        >
          <div className="space-y-4">
            {bulkCreateResult.succeeded.length > 0 && (
              <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-success-800">
                  ✓ {bulkCreateResult.succeeded.length} pembayaran berhasil dibuat
                </p>
              </div>
            )}
            {bulkCreateResult.failed.length > 0 && (
              <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-danger-800 mb-2">
                  ✗ {bulkCreateResult.failed.length} gagal:
                </p>
                <ul className="space-y-1 text-xs text-danger-700 list-disc list-inside">
                  {bulkCreateResult.failed.map((f, i) => (
                    <li key={i}>{f.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setBulkCreateResult(null)}
            >
              Tutup
            </Button>
          </div>
        </Modal>
      )}

      {/* Bulk Approve Confirmation Modal */}
      <ConfirmModal
        isOpen={bulkApproveModalOpen}
        onClose={() => setBulkApproveModalOpen(false)}
        title={t('approve_multiple_title')}
        message={t('approve_multiple_message', { count: selectedPaymentIds.length })}
        confirmText={t('approve_all')}
        cancelText={tCommon('actions.cancel')}
        onConfirm={handleBulkApprove}
        isLoading={isBulkProcessing}
        variant="primary"
      />

      {/* WhatsApp Message Generator Modal */}
      <Modal
        isOpen={whatsappModalOpen}
        onClose={() => setWhatsappModalOpen(false)}
        title="Generator Pesan WhatsApp"
        size="lg"
      >
        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
          {(["today", "unpaid"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setWhatsappTab(tab)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                whatsappTab === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "today" ? "Pembayaran Hari Ini" : "Belum Bayar Bulan Ini"}
            </button>
          ))}
        </div>

        {isLoadingWA ? (
          <div className="flex items-center justify-center py-12">
            <svg className="animate-spin w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : (
          <>
            <textarea
              readOnly
              value={whatsappTab === "today" ? whatsappTodayMsg : whatsappUnpaidMsg}
              rows={12}
              className="w-full px-3 py-3 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none"
            />
            <button
              onClick={() =>
                handleCopyWA(
                  whatsappTab === "today" ? whatsappTodayMsg : whatsappUnpaidMsg,
                  whatsappTab
                )
              }
              className={`w-full mt-3 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                (whatsappTab === "today" && isCopiedToday) ||
                (whatsappTab === "unpaid" && isCopiedUnpaid)
                  ? "bg-emerald-500 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {(whatsappTab === "today" && isCopiedToday) ||
              (whatsappTab === "unpaid" && isCopiedUnpaid) ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Disalin!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Salin Pesan
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              Tanda *bintang* akan tampil tebal di WhatsApp.
            </p>
          </>
        )}
      </Modal>
    </div>
  );
}
