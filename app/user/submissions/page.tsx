"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ClipboardList,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  X,
} from "lucide-react";
import SubmissionForm from "@/components/forms/SubmissionForm";
import {
  SUBMISSION_TYPE_LABEL,
  SUBMISSION_STATUS_CONFIG,
} from "@/lib/validations/submission.schema";

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
  reviewer: Reviewer | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

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

export default function UserSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
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
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchSubmissions();
  }, [fetchSubmissions]);

  const filteredSubmissions = submissions;

  if (loading) {
    return (
      <div className="px-4 pt-2 pb-4 space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded-xl w-48" />
          <div className="h-12 bg-slate-200 rounded-2xl" />
          <div className="h-48 bg-slate-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="px-4 pt-2 pb-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-slate-900">
          Pengaduan & Permintaan
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Kirim feedback atau permintaan layanan
        </p>
      </motion.div>

      {/* New Submission Button */}
      <AnimatePresence>
        {!showForm && (
          <motion.div
            variants={itemVariants}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <button
              onClick={() => setShowForm(true)}
              className="w-full bg-blue-600 text-white rounded-2xl p-4 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[0.98] transition-transform duration-150"
            >
              <Plus className="w-4 h-4" />
              Buat Pengaduan / Permintaan
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <SubmissionForm
              onSuccess={() => {
                setShowForm(false);
                fetchSubmissions();
              }}
              onCancel={() => setShowForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* History List */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Riwayat
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 border-none outline-none"
          >
            <option value="">Semua</option>
            <option value="PENDING">Menunggu</option>
            <option value="IN_REVIEW">Ditinjau</option>
            <option value="RESOLVED">Selesai</option>
            <option value="CLOSED">Ditutup</option>
          </select>
        </div>

        {filteredSubmissions.length === 0 ? (
          <div className="py-8 text-center">
            <MessageSquare className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada pengaduan</p>
          </div>
        ) : (
          <div>
            {filteredSubmissions.map((s, i) => {
              const cfg = SUBMISSION_STATUS_CONFIG[s.status];
              const Icon = STATUS_ICONS[s.status];
              return (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.04 }}
                  onClick={() => setSelectedSubmission(s)}
                  className="w-full flex items-start justify-between py-3 border-b border-slate-50 last:border-0 text-left hover:bg-slate-50 -mx-4 px-4 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bgClass}`}
                    >
                      <Icon className={`w-4 h-4 ${cfg.colorClass}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {SUBMISSION_TYPE_LABEL[s.type]} ·{" "}
                        {formatDate(s.createdAt)}
                      </p>
                      {s.adminNote && (
                        <p className="text-[11px] text-blue-600 mt-0.5 truncate">
                          Balasan: {s.adminNote}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ml-2 mt-0.5 ${cfg.bgClass} ${cfg.colorClass}`}
                  >
                    {cfg.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Detail Bottom Sheet */}
      <AnimatePresence>
        {selectedSubmission && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-end"
            onClick={() => setSelectedSubmission(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-md mx-auto bg-white rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sheet header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${SUBMISSION_STATUS_CONFIG[selectedSubmission.status].bgClass} ${SUBMISSION_STATUS_CONFIG[selectedSubmission.status].colorClass}`}
                    >
                      {SUBMISSION_STATUS_CONFIG[selectedSubmission.status].label}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {SUBMISSION_TYPE_LABEL[selectedSubmission.type]}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedSubmission.title}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Content */}
              <div className="bg-slate-50 rounded-xl p-3 mb-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {selectedSubmission.content}
                </p>
              </div>

              {/* Admin note */}
              {selectedSubmission.adminNote && (
                <div className="border-l-4 border-blue-400 bg-blue-50 rounded-r-xl pl-3 pr-3 py-3 mb-4">
                  <p className="text-[11px] font-semibold text-blue-600 mb-1">
                    Balasan Admin
                  </p>
                  <p className="text-sm text-slate-700">
                    {selectedSubmission.adminNote}
                  </p>
                  {selectedSubmission.reviewedAt && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatDate(selectedSubmission.reviewedAt)}
                    </p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Dikirim {formatDate(selectedSubmission.createdAt)}</span>
                {selectedSubmission.reviewer && (
                  <span>Ditinjau oleh {selectedSubmission.reviewer.name}</span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
