"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Image as ImageIcon, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface ShiftReport {
  id: string;
  reportType: string;
  content: string;
  photoUrl: string | null;
  reportedAt: string;
  attendance: {
    clockInAt: string;
    shiftStartTime: string;
  } | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function ShiftReportsPage() {
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [reportType, setReportType] = useState<"SHIFT_START" | "SHIFT_MIDDLE" | "SHIFT_END">("SHIFT_START");
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch active shift
      const activeRes = await fetch("/api/attendance/active");
      const activeData = await activeRes.json();
      setActiveShift(activeData.activeShift);

      // Fetch reports
      const reportsRes = await fetch("/api/shift-reports");
      const reportsData = await reportsRes.json();
      setReports(reportsData.reports || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!activeShift) {
      setError("You must clock in before submitting a report");
      return;
    }

    if (content.length < 10) {
      setError("Report content must be at least 10 characters");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("reportType", reportType);
      formData.append("content", content);
      if (photo) {
        formData.append("photo", photo);
      }

      const res = await fetch("/api/shift-reports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report");
      }

      setSuccess("Report submitted successfully!");

      // Reset form
      setContent("");
      setPhoto(null);
      setReportType("SHIFT_START");

      // Refresh reports
      await fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReportTypeBadge = (type: string) => {
    const config = {
      SHIFT_START: { label: "Mulai", color: "bg-blue-50 text-blue-600" },
      SHIFT_MIDDLE: { label: "Tengah", color: "bg-amber-50 text-amber-600" },
      SHIFT_END: { label: "Selesai", color: "bg-emerald-50 text-emerald-600" },
    };
    const { label, color } = config[type as keyof typeof config] || { label: type, color: "bg-slate-100 text-slate-700" };
    return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
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
      <motion.div variants={itemVariants}>
        <h1 className="text-xl font-bold text-slate-900">Laporan Shift</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Kirim laporan berkala selama shift Anda
        </p>
      </motion.div>

      {/* Submit Report Form */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Kirim Laporan
        </h2>

        {!activeShift && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-sm text-amber-800">
                Anda harus clock in sebelum mengirim laporan
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-3 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <p className="text-sm text-emerald-800">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tipe Laporan <span className="text-red-500">*</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              disabled={!activeShift}
              className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            >
              <option value="SHIFT_START">Awal Shift</option>
              <option value="SHIFT_MIDDLE">Tengah Shift</option>
              <option value="SHIFT_END">Akhir Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Isi Laporan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!activeShift}
              placeholder="Deskripsikan pengamatan, aktivitas, atau kejadian (min. 10 karakter)"
              rows={5}
              className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              {content.length} karakter (min. 10 diperlukan)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Foto (Opsional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              disabled={!activeShift}
              className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            {photo && (
              <div className="flex items-center gap-2 mt-2 text-sm text-emerald-600">
                <CheckCircle className="w-4 h-4" />
                {photo.name}
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={submitting}
            disabled={!activeShift || content.length < 10}
            fullWidth
            className="active:scale-[0.98] transition-transform duration-150"
          >
            <FileText className="w-5 h-5 mr-2" />
            Kirim Laporan
          </Button>
        </form>
      </motion.div>

      {/* Recent Reports */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Laporan Terkini
        </h2>

        {reports.length > 0 ? (
          <div className="space-y-3">
            {reports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.04 }}
                className="border border-slate-100 rounded-2xl p-3"
              >
                <div className="flex items-start justify-between mb-2">
                  {getReportTypeBadge(report.reportType)}
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    {formatDate(report.reportedAt)}
                  </div>
                </div>

                <p className="text-sm text-slate-700 mb-2 whitespace-pre-wrap">
                  {report.content}
                </p>

                {report.photoUrl && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <ImageIcon className="w-4 h-4" />
                    Foto terlampir
                  </div>
                )}

                {report.attendance && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      Shift: {report.attendance.shiftStartTime} -{" "}
                      {formatDate(report.attendance.clockInAt)}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium mb-1">Belum Ada Laporan</p>
            <p className="text-sm text-slate-400">
              Kirim laporan shift pertama Anda di atas
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
