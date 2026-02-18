"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Clock, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ActiveShift {
  id: string;
  clockInAt: string;
  shiftStartTime: string;
  shiftReports: Array<{ reportType: string }>;
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
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
} as const;

export default function StaffDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch active shift
      const activeRes = await fetch("/api/attendance/active");
      const activeData = await activeRes.json();
      setActiveShift(activeData.activeShift);

      // Fetch recent history
      const historyRes = await fetch("/api/attendance/history?limit=5");
      const historyData = await historyRes.json();
      setAttendanceHistory(historyData.history || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReportStatus = (shift: any) => {
    const reportTypes = shift.shiftReports?.map((r: any) => r.reportType) || [];
    return {
      start: reportTypes.includes("SHIFT_START"),
      middle: reportTypes.includes("SHIFT_MIDDLE"),
      end: reportTypes.includes("SHIFT_END"),
    };
  };

  // Dynamic greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 11) return "Selamat pagi";
    if (hour < 15) return "Selamat siang";
    if (hour < 18) return "Selamat sore";
    return "Selamat malam";
  };

  if (loading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-200 rounded-2xl" />
          <div className="h-32 bg-slate-200 rounded-2xl" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-slate-200 rounded-2xl" />
            <div className="h-24 bg-slate-200 rounded-2xl" />
          </div>
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
      {/* Greeting Section */}
      <motion.div variants={itemVariants}>
        <p className="text-sm text-slate-500">{getGreeting()} 👋</p>
        <h1 className="text-xl font-bold text-slate-900">
          {session?.user?.name || "Staff"}
        </h1>
      </motion.div>

      {/* Active Shift Status */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Status Saat Ini</h2>
        {activeShift ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-900">Sedang Bertugas</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-slate-400">Masuk</p>
                <p className="text-sm font-medium text-slate-800">
                  {formatDate(activeShift.clockInAt)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Durasi</p>
                <p className="text-sm font-medium text-slate-800">
                  {calculateDuration(activeShift.clockInAt)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Shift Mulai</p>
                <p className="text-sm font-medium text-slate-800">
                  {activeShift.shiftStartTime}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-slate-400">Laporan</p>
                <p className="text-sm font-medium text-slate-800">
                  {activeShift.shiftReports?.length || 0} / 3
                </p>
              </div>
            </div>

            {/* Report Status */}
            {activeShift.shiftReports && (
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-700 mb-2">Status Laporan:</p>
                <div className="flex gap-2">
                  {["START", "MIDDLE", "END"].map((type) => {
                    const submitted = activeShift.shiftReports.some(
                      (r: any) => r.reportType === `SHIFT_${type}`
                    );
                    return (
                      <span
                        key={type}
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          submitted
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {submitted ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {type}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-600">Tidak sedang bertugas</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Buka halaman Absensi untuk mulai shift
            </p>
          </div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push("/staff/reports")}
          className="bg-blue-600 text-white rounded-2xl p-4 text-left active:scale-[0.98] transition-transform duration-150"
        >
          <FileText className="w-7 h-7 mb-2" />
          <p className="text-sm font-semibold">Buat Laporan</p>
          <p className="text-[10px] text-blue-100 mt-0.5">Tambah laporan shift</p>
        </button>
        <button
          onClick={() => router.push("/staff/attendance")}
          className="bg-emerald-600 text-white rounded-2xl p-4 text-left active:scale-[0.98] transition-transform duration-150"
        >
          <Clock className="w-7 h-7 mb-2" />
          <p className="text-sm font-semibold">Absensi</p>
          <p className="text-[10px] text-emerald-100 mt-0.5">Clock in/out</p>
        </button>

        {/* Unpaid Residents - Spans 2 columns */}
        <button
          onClick={() => router.push("/staff/unpaid-residents")}
          className="bg-amber-600 text-white rounded-2xl p-4 text-left active:scale-[0.98] transition-transform duration-150 col-span-2"
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-7 h-7" />
            <div>
              <p className="text-sm font-semibold">Penghuni Belum Bayar</p>
              <p className="text-[10px] text-amber-100 mt-0.5">Lihat daftar penghuni yang belum bayar bulan ini</p>
            </div>
          </div>
        </button>
      </motion.div>

      {/* Recent Attendance */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-4"
      >
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Riwayat Absensi
        </h2>
        {attendanceHistory.length > 0 ? (
          <div className="space-y-2">
            {attendanceHistory.map((record, index) => (
              <motion.div
                key={record.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.04 }}
                className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {formatDate(record.clockInAt)}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Shift: {record.shiftStartTime}
                  </p>
                </div>
                <div className="text-right">
                  {record.clockOutAt ? (
                    <>
                      <p className="text-[11px] text-slate-400">Selesai</p>
                      <p className="text-xs font-medium text-slate-700">
                        {formatDate(record.clockOutAt)}
                      </p>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">
                      Aktif
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-4">
            Belum ada riwayat absensi
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
