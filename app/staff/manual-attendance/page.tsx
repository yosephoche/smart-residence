"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ClipboardList, CheckCircle, Clock, XCircle, AlertCircle, Plus, ChevronLeft } from "lucide-react";

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

interface ManualAttendanceRequest {
  id: string;
  date: string;
  clockInAt: string;
  clockOutAt: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote?: string | null;
  createdAt: string;
  schedule: {
    shiftTemplate: { shiftName: string; startTime: string; endTime: string };
  };
}

const statusConfig = {
  APPROVED: { label: "Disetujui", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
  PENDING: { label: "Menunggu", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  REJECTED: { label: "Ditolak", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
};

/** Local calendar date, N days back, as "YYYY-MM-DD" — never via toISOString(),
 * which converts to UTC first and silently shifts the date for any user whose
 * local clock sits ahead of UTC (e.g. WITA, UTC+8) between midnight and the
 * offset hour. */
function localDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMaxDate(): string {
  return localDateDaysAgo(1);
}

function getMinDate(): string {
  return localDateDaysAgo(2);
}

export default function StaffManualAttendancePage() {
  const router = useRouter();
  const [requests, setRequests] = useState<ManualAttendanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    date: "",
    clockInTime: "",
    clockOutTime: "",
    reason: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/staff/manual-attendance");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
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
      const date = new Date(`${form.date}T00:00:00.000Z`);
      const clockInAt = new Date(`${form.date}T${form.clockInTime}:00`);
      const clockOutAt = new Date(`${form.date}T${form.clockOutTime}:00`);

      const res = await fetch("/api/staff/manual-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: date.toISOString(),
          clockInAt: clockInAt.toISOString(),
          clockOutAt: clockOutAt.toISOString(),
          reason: form.reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengajukan absen manual");

      setSubmitSuccess(true);
      setForm({ date: "", clockInTime: "", clockOutTime: "", reason: "" });

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

  return (
    <motion.div
      className="px-4 pt-2 pb-4 space-y-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <button onClick={() => router.push("/staff/attendance")} className="text-slate-400">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Absen Manual</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Untuk shift 1-2 hari lalu yang terlewat absen langsung
          </p>
        </div>
      </motion.div>

      {/* Request Button */}
      {!showForm && (
        <motion.div variants={itemVariants}>
          <button
            onClick={() => setShowForm(true)}
            className="w-full bg-blue-600 text-white rounded-2xl p-4 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[0.98] transition-transform duration-150"
          >
            <Plus className="w-4 h-4" />
            Ajukan Absen Manual
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
              <ClipboardList className="w-4 h-4 text-slate-400" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                Form Absen Manual
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Tanggal Shift
                </label>
                <input
                  type="date"
                  min={getMinDate()}
                  max={getMaxDate()}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Hanya untuk tanggal yang sudah ada jadwal shift Anda, maksimum 2 hari ke belakang
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jam Masuk
                  </label>
                  <input
                    type="time"
                    value={form.clockInTime}
                    onChange={(e) => setForm({ ...form, clockInTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Jam Keluar
                  </label>
                  <input
                    type="time"
                    value={form.clockOutTime}
                    onChange={(e) => setForm({ ...form, clockOutTime: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Alasan
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  required
                  minLength={10}
                  maxLength={500}
                  rows={3}
                  placeholder="Jelaskan kenapa Anda tidak bisa absen langsung saat itu (min. 10 karakter)..."
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
                      {submitting ? "Mengirim..." : "Ajukan"}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-slate-400" />
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
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada pengajuan absen manual</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req, index) => {
              const cfg = statusConfig[req.status];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={req.id}
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
                        {new Date(req.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {req.schedule.shiftTemplate.shiftName} ·{" "}
                        {new Date(req.clockInAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {" - "}
                        {new Date(req.clockOutAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {req.rejectionNote && (
                        <p className="text-[10px] text-red-500 mt-0.5">
                          Catatan: {req.rejectionNote}
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
