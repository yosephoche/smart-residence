"use client";

import { m } from "framer-motion";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ClipboardList, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import Table, { Column, Pagination } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = "force-dynamic";

interface ManualAttendanceRequest {
  id: string;
  date: string;
  clockInAt: string;
  clockOutAt: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  staff: {
    id: string;
    name: string;
    staffJobType: string;
  };
  reviewer?: {
    id: string;
    name: string;
  } | null;
  schedule: {
    shiftTemplate: { shiftName: string; startTime: string; endTime: string };
  };
}

const statusBadge = {
  APPROVED: { label: "Disetujui", variant: "success" as const },
  PENDING: { label: "Menunggu", variant: "warning" as const },
  REJECTED: { label: "Ditolak", variant: "danger" as const },
};

const JOB_TYPE_LABELS: Record<string, string> = {
  SECURITY: "Keamanan",
  CLEANING: "Kebersihan",
  GARDENING: "Taman",
  MAINTENANCE: "Pemeliharaan",
  OTHER: "Lainnya",
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminManualAttendancePage() {
  const [requests, setRequests] = useState<ManualAttendanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const {
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    paginatedData,
    totalPages,
    totalItems,
  } = usePagination(requests, {
    initialPageSize: 25,
    resetDeps: [statusFilter],
  });

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/staff/manual-attendance?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      setRequests(data.requests ?? []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id + "-approve");
    try {
      const res = await fetch(`/api/admin/staff/manual-attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyetujui");
      toast.success("Absen manual disetujui");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    const note = window.prompt("Catatan penolakan (opsional):");
    if (note === null) return; // cancelled

    setActionLoading(id + "-reject");
    try {
      const res = await fetch(`/api/admin/staff/manual-attendance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionNote: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menolak");
      toast.success("Absen manual ditolak");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const columns: Column<ManualAttendanceRequest>[] = [
    {
      key: "staff",
      header: "Staff",
      render: (_, row) => (
        <div>
          <div className="font-medium text-slate-900">{row.staff.name}</div>
          <div className="text-sm text-slate-500">
            {JOB_TYPE_LABELS[row.staff.staffJobType] ?? row.staff.staffJobType}
          </div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Tanggal Shift",
      render: (_, row) => (
        <div>
          <div className="font-medium">
            {new Date(row.date).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div className="text-sm text-slate-500">
            {row.schedule.shiftTemplate.shiftName} ({formatTime(row.clockInAt)}–{formatTime(row.clockOutAt)})
          </div>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Alasan",
      render: (_, row) => (
        <div className="max-w-[200px] text-sm text-slate-700 truncate" title={row.reason}>
          {row.reason}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (_, row) => {
        const cfg = statusBadge[row.status];
        return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
      },
    },
    {
      key: "actions" as any,
      header: "Aksi",
      render: (_, row) => {
        if (row.status !== "PENDING") {
          return (
            <span className="text-xs text-slate-400">
              {row.reviewer ? `oleh ${row.reviewer.name}` : "-"}
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleApprove(row.id)}
              disabled={actionLoading === row.id + "-approve"}
              className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Setujui
            </button>
            <button
              onClick={() => handleReject(row.id)}
              disabled={actionLoading === row.id + "-reject"}
              className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              Tolak
            </button>
          </div>
        );
      },
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
  };

  return (
    <m.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8" />
            Absen Manual
          </h1>
          <p className="text-slate-500 mt-1">Kelola pengajuan absen manual (backfill) staff</p>
        </div>
        <Button variant="secondary" onClick={fetchRequests}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Segarkan
        </Button>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua</option>
              <option value="PENDING">Menunggu</option>
              <option value="APPROVED">Disetujui</option>
              <option value="REJECTED">Ditolak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
        <>
          <Table
            columns={columns}
            data={paginatedData}
            keyExtractor={(row) => row.id}
            emptyMessage="Tidak ada pengajuan absen manual"
          />
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
        </>
      )}
    </m.div>
  );
}
