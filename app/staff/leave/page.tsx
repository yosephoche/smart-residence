"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarRange, CheckCircle, Clock, XCircle, AlertCircle, Plus } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

interface LeaveConfig {
  maxDaysPerRequest: number;
  minAdvanceDays: number;
}

interface Leave {
  id: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote?: string;
  createdAt: string;
}

const statusConfig = {
  APPROVED: { label: "Disetujui", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
  PENDING: { label: "Menunggu", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  REJECTED: { label: "Ditolak", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
};

function getMinDate(minAdvanceDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + minAdvanceDays);
  return d.toISOString().split("T")[0];
}

export default function StaffLeavePage() {
  const [config, setConfig] = useState<LeaveConfig | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    startDate: "",
    endDate: "",
    reason: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, leavesRes] = await Promise.all([
        fetch("/api/system-config/leave-config"),
        fetch("/api/staff/leave"),
      ]);

      if (configRes.ok) {
        setConfig(await configRes.json());
      }
      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setLeaves(data.leaves ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/staff/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          reason: form.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan cuti");

      setSubmitSuccess(true);
      setForm({ startDate: "", endDate: "", reason: "" });

      setTimeout(() => {
        setSubmitSuccess(false);
        setShowForm(false);
        fetchData();
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const minDate = config ? getMinDate(config.minAdvanceDays) : getMinDate(7);

  return (
    <motion.div
      className="px-4 pt-2 pb-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-slate-900">Pengajuan Cuti</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          {config
            ? `Maks. ${config.maxDaysPerRequest} hari · Ajukan minimal ${config.minAdvanceDays} hari sebelumnya`
            : "Memuat konfigurasi..."}
        </p>
      </motion.div>

      {/* Request Button */}
      {!showForm && (
        <motion.div variants={itemVariants}>
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-blue-600 text-white rounded-2xl p-4 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[0.98] transition-transform duration-150"
          >
            <Plus className="w-4 h-4" />
            Ajukan Cuti Baru
          </button>
        </motion.div>
      )}

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
          >
            <div className="flex items-center gap-2 mb-4">
              <CalendarRange className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Form Pengajuan Cuti
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal Mulai
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tanggal Selesai
                  </label>
                  <input
                    type="date"
                    min={form.startDate || minDate}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alasan Cuti
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  placeholder="Jelaskan alasan pengajuan cuti Anda (min. 10 karakter)..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">
                  {form.reason.length}/500
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(""); }}
                  className="flex-1 py-3 text-sm font-medium text-slate-600 bg-slate-100 rounded-2xl active:scale-[0.98] transition-transform duration-150"
                >
                  Batal
                </button>

                <AnimatePresence mode="wait">
                  {submitSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Terkirim!
                    </motion.div>
                  ) : (
                    <motion.button
                      key="submit"
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-3 text-sm font-semibold text-white bg-blue-600 rounded-2xl disabled:opacity-50 active:scale-[0.98] transition-transform duration-150"
                    >
                      {submitting ? "Mengirim..." : "Ajukan Cuti"}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave History */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-4 h-4 text-slate-400" />
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Riwayat Pengajuan
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-8">
            <CalendarRange className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada pengajuan cuti</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaves.map((leave, index) => {
              const cfg = statusConfig[leave.status];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={leave.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.04 }}
                  className="flex items-start justify-between py-3 border-b border-slate-50 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {new Date(leave.startDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        })}
                        {" – "}
                        {new Date(leave.endDate).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {leave.totalDays} hari · {leave.reason.slice(0, 40)}
                        {leave.reason.length > 40 ? "..." : ""}
                      </p>
                      {leave.rejectionNote && (
                        <p className="text-[10px] text-red-500 mt-0.5">
                          Catatan: {leave.rejectionNote}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} flex-shrink-0 ml-2`}
                  >
                    {cfg.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
