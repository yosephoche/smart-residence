"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { CalendarRange, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import Table, { Column, Pagination } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = "force-dynamic";

interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
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

export default function AdminLeavePage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
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
  } = usePagination(leaves, {
    initialPageSize: 25,
    resetDeps: [statusFilter],
  });

  useEffect(() => {
    fetchLeaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/admin/staff/leave?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      setLeaves(data.leaves ?? []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id + "-approve");
    try {
      const res = await fetch(`/api/admin/staff/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyetujui");
      toast.success("Cuti disetujui");
      fetchLeaves();
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
      const res = await fetch(`/api/admin/staff/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionNote: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menolak");
      toast.success("Cuti ditolak");
      fetchLeaves();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const columns: Column<Leave>[] = [
    {
      key: "staff",
      header: "Staff",
      render: (_, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.staff.name}</div>
          <div className="text-sm text-gray-500">
            {JOB_TYPE_LABELS[row.staff.staffJobType] ?? row.staff.staffJobType}
          </div>
        </div>
      ),
    },
    {
      key: "startDate",
      header: "Periode Cuti",
      render: (_, row) => (
        <div>
          <div className="font-medium">
            {new Date(row.startDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div className="text-sm text-gray-500">
            s/d{" "}
            {new Date(row.endDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </div>
        </div>
      ),
    },
    {
      key: "totalDays",
      header: "Hari",
      render: (_, row) => <span className="font-semibold">{row.totalDays}</span>,
    },
    {
      key: "reason",
      header: "Alasan",
      render: (_, row) => (
        <div
          className="max-w-[200px] text-sm text-gray-700 truncate"
          title={row.reason}
        >
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
            <span className="text-xs text-gray-400">
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarRange className="w-8 h-8" />
            Cuti Staff
          </h1>
          <p className="text-gray-500 mt-1">Kelola pengajuan cuti staff</p>
        </div>
        <Button variant="secondary" onClick={fetchLeaves}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Segarkan
        </Button>
      </div>

      {/* Filter Row */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            emptyMessage="Tidak ada pengajuan cuti"
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
    </div>
  );
}
