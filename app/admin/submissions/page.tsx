"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Search,
  X,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Save,
} from "lucide-react";
import { usePagination } from "@/lib/hooks/usePagination";
import {
  SUBMISSION_TYPE_LABEL,
  SUBMISSION_STATUS_CONFIG,
} from "@/lib/validations/submission.schema";

interface User {
  id: string;
  name: string;
  email: string;
}

interface Reviewer {
  id: string;
  name: string;
}

interface Submission {
  id: string;
  type: string;
  title: string;
  content: string;
  status: keyof typeof SUBMISSION_STATUS_CONFIG;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  user: User;
  reviewer: Reviewer | null;
}

const STATUS_ICONS = {
  PENDING: Clock,
  IN_REVIEW: Eye,
  RESOLVED: CheckCircle,
  CLOSED: XCircle,
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Review panel state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const {
    paginatedData,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    handlePageChange,
    handlePageSizeChange,
  } = usePagination(submissions, {
    resetDeps: [statusFilter, typeFilter, search],
  });

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/submissions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions);
      }
    } catch (err) {
      console.error("Failed to fetch submissions", err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, search]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const reviewingSubmission = submissions.find((s) => s.id === reviewingId);

  const openReview = (submission: Submission) => {
    setReviewingId(submission.id);
    setReviewStatus(submission.status === "PENDING" ? "IN_REVIEW" : submission.status);
    setReviewNote(submission.adminNote ?? "");
    setReviewSuccess(false);
  };

  const handleSaveReview = async () => {
    if (!reviewingId || !reviewStatus) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/submissions/${reviewingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, adminNote: reviewNote }),
      });
      if (res.ok) {
        setReviewSuccess(true);
        await fetchSubmissions();
        setTimeout(() => {
          setReviewingId(null);
          setReviewSuccess(false);
        }, 1000);
      }
    } catch (err) {
      console.error("Review failed", err);
    } finally {
      setActionLoading(false);
    }
  };

  const pendingCount = submissions.filter((s) => s.status === "PENDING").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pengaduan & Permintaan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tinjau dan tanggapi pengaduan dari penghuni
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-amber-500">Menunggu</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-center">
            <p className="text-xl font-bold text-blue-600">{submissions.length}</p>
            <p className="text-xs text-blue-500">Total</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari judul atau isi..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Semua Tipe</option>
            <option value="FEEDBACK">Feedback / Kritik</option>
            <option value="SUGGESTION">Masukan / Saran</option>
            <option value="ACCESS_CARD_REPAIR">Perbaikan Kartu Akses</option>
            <option value="ACCESS_CARD_REPLACEMENT">Penggantian Kartu Akses</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Menunggu</option>
            <option value="IN_REVIEW">Ditinjau</option>
            <option value="RESOLVED">Selesai</option>
            <option value="CLOSED">Ditutup</option>
          </select>
          {(search || typeFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("");
                setStatusFilter("");
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Memuat data...</div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400">Belum ada pengaduan</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Penghuni
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tipe
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Judul
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((s) => {
                  const cfg = SUBMISSION_STATUS_CONFIG[s.status];
                  const Icon = STATUS_ICONS[s.status];
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">
                          {s.user.name}
                        </p>
                        <p className="text-xs text-gray-400">{s.user.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600">
                          {SUBMISSION_TYPE_LABEL[s.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p
                          className="text-sm text-gray-800 truncate"
                          title={s.title}
                        >
                          {s.title}
                        </p>
                        {s.adminNote && (
                          <p className="text-xs text-blue-500 truncate mt-0.5">
                            Balasan: {s.adminNote}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${cfg.bgClass} ${cfg.colorClass}`}
                        >
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-500">
                          {formatDate(s.createdAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openReview(s)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Tinjau
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {totalItems} data
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) =>
                      handlePageSizeChange(Number(e.target.value))
                    }
                    className="text-xs border border-gray-200 rounded px-1 py-0.5"
                  >
                    {[10, 25, 50, 100].map((s) => (
                      <option key={s} value={s}>
                        {s}/hal
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-gray-600 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Review Side Panel */}
      <AnimatePresence>
        {reviewingId && reviewingSubmission && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setReviewingId(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h2 className="text-base font-bold text-gray-900">
                  Tinjau Pengaduan
                </h2>
                <button
                  onClick={() => setReviewingId(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Submission info */}
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${SUBMISSION_STATUS_CONFIG[reviewingSubmission.status].bgClass} ${SUBMISSION_STATUS_CONFIG[reviewingSubmission.status].colorClass}`}
                    >
                      {SUBMISSION_STATUS_CONFIG[reviewingSubmission.status].label}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {SUBMISSION_TYPE_LABEL[reviewingSubmission.type]}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">
                    {reviewingSubmission.title}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">
                    dari <strong>{reviewingSubmission.user.name}</strong> ·{" "}
                    {formatDate(reviewingSubmission.createdAt)}
                  </p>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {reviewingSubmission.content}
                    </p>
                  </div>
                </div>

                {/* Status select */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Ubah Status
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="IN_REVIEW">Ditinjau</option>
                    <option value="RESOLVED">Selesai</option>
                    <option value="CLOSED">Ditutup</option>
                  </select>
                </div>

                {/* Admin note */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Catatan / Balasan (opsional)
                  </label>
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    maxLength={500}
                    rows={4}
                    placeholder="Tuliskan balasan atau catatan untuk penghuni..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1 text-right">
                    {reviewNote.length}/500
                  </p>
                </div>
              </div>

              {/* Panel footer */}
              <div className="p-4 border-t border-gray-100">
                <AnimatePresence mode="wait">
                  {reviewSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full py-3 bg-emerald-500 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Tersimpan!
                    </motion.div>
                  ) : (
                    <motion.button
                      key="save"
                      onClick={handleSaveReview}
                      disabled={actionLoading || !reviewStatus}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      {actionLoading ? "Menyimpan..." : "Simpan"}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
