"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, MapPin, Clock, CheckCircle } from "lucide-react";
import CameraCapture from "@/components/ui/CameraCapture";
import Button from "@/components/ui/Button";

interface ActiveShift {
  id: string;
  clockInAt: string;
  shiftStartTime: string;
}

interface TodaySchedule {
  id: string;
  date: string;
  shiftTemplate: {
    shiftName: string;
    startTime: string;
    endTime: string;
  };
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

export default function AttendancePage() {
  const router = useRouter();
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(null);
  const [loading, setLoading] = useState(true);

  // Clock In state
  const [shiftStartTime, setShiftStartTime] = useState("");
  const [clockInPhoto, setClockInPhoto] = useState<File | null>(null);
  const [clockInLocation, setClockInLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [showClockInCamera, setShowClockInCamera] = useState(false);

  // Clock Out state
  const [clockOutPhoto, setClockOutPhoto] = useState<File | null>(null);
  const [clockOutLocation, setClockOutLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [showClockOutCamera, setShowClockOutCamera] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveShift();
    fetchTodaySchedule();
  }, []);

  // Auto-fill shift start time from schedule
  useEffect(() => {
    if (todaySchedule && !shiftStartTime) {
      setShiftStartTime(todaySchedule.shiftTemplate.startTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todaySchedule]);

  const fetchActiveShift = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/attendance/active");
      const data = await res.json();
      setActiveShift(data.activeShift);
    } catch (err) {
      console.error("Failed to fetch active shift:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodaySchedule = async () => {
    try {
      const res = await fetch("/api/staff/schedule/today");
      const data = await res.json();
      if (res.ok && data.schedule) {
        setTodaySchedule(data.schedule);
      }
    } catch (err) {
      console.error("Failed to fetch today's schedule:", err);
    }
  };

  const captureLocation = (setter: (loc: { lat: number; lon: number }) => void) => {
    setError(null);
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setter({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (err) => {
        console.error("Geolocation error:", err);
        if (err.code === err.PERMISSION_DENIED) {
          setError("Location permission denied. Please allow location access in your browser settings.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Location information unavailable. Please try again.");
        } else {
          setError("Failed to get your location. Please try again.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClockIn = async () => {
    if (!shiftStartTime || !clockInPhoto || !clockInLocation) {
      setError("Please complete all fields: shift start time, photo, and location");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append("shiftStartTime", shiftStartTime);
      formData.append("lat", clockInLocation.lat.toString());
      formData.append("lon", clockInLocation.lon.toString());
      formData.append("photo", clockInPhoto);

      // If there's a schedule, pass the scheduleId
      if (todaySchedule) {
        formData.append("scheduleId", todaySchedule.id);
      }

      const res = await fetch("/api/attendance/clock-in", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to clock in");
      }

      // Success - refresh active shift
      await fetchActiveShift();

      // Reset form
      setShiftStartTime("");
      setClockInPhoto(null);
      setClockInLocation(null);
    } catch (err: any) {
      console.error("Clock in error:", err);
      setError(err.message || "Failed to clock in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!clockOutPhoto || !clockOutLocation) {
      setError("Please complete all fields: photo and location");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const formData = new FormData();
      formData.append("lat", clockOutLocation.lat.toString());
      formData.append("lon", clockOutLocation.lon.toString());
      formData.append("photo", clockOutPhoto);

      const res = await fetch("/api/attendance/clock-out", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to clock out");
      }

      // Success - refresh active shift
      await fetchActiveShift();

      // Reset form
      setClockOutPhoto(null);
      setClockOutLocation(null);
    } catch (err: any) {
      console.error("Clock out error:", err);
      setError(err.message || "Failed to clock out. Please try again.");
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

  if (loading) {
    return (
      <div className="px-4 pt-2 pb-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-slate-200 rounded-2xl" />
          <div className="h-64 bg-slate-200 rounded-2xl" />
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
        <h1 className="text-xl font-bold text-slate-900">Absensi</h1>
        <p className="text-sm text-slate-400 mt-0.5">Clock in dan clock out shift Anda</p>
      </motion.div>

      {error && (
        <motion.div
          variants={itemVariants}
          className="bg-red-50 border border-red-200 rounded-2xl p-4"
        >
          <p className="text-sm text-red-800">{error}</p>
        </motion.div>
      )}

      {/* Clock In Form (when not clocked in) */}
      {!activeShift && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-4 space-y-4"
        >
          <h2 className="text-sm font-semibold text-slate-900">Clock In</h2>

          {/* Display scheduled shift if exists */}
          {todaySchedule && (
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
              <h3 className="text-xs font-semibold text-blue-900 mb-1">
                Jadwal Shift Anda
              </h3>
              <p className="text-sm text-blue-800">
                {todaySchedule.shiftTemplate.shiftName}
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                {todaySchedule.shiftTemplate.startTime} - {todaySchedule.shiftTemplate.endTime}
              </p>
            </div>
          )}

          {!todaySchedule && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
              <p className="text-sm text-amber-800">
                Anda tidak memiliki jadwal shift hari ini. Hubungi admin jika ini tidak benar.
              </p>
            </div>
          )}

          {/* Shift Start Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Waktu Mulai Shift <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={shiftStartTime}
              onChange={(e) => setShiftStartTime(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            />
            <p className="text-xs text-slate-400 mt-1">
              {todaySchedule
                ? "Diisi otomatis dari jadwal (bisa diubah jika perlu)"
                : "Masukkan waktu mulai shift"}
            </p>
          </div>

          {/* Photo Capture */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Foto Selfie <span className="text-red-500">*</span>
            </label>
            {clockInPhoto ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                  Foto berhasil diambil
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClockInCamera(true)}
                >
                  Ambil Ulang Foto
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowClockInCamera(true)}
                className="w-full"
              >
                <Camera className="w-5 h-5 mr-2" />
                Ambil Foto Selfie
              </Button>
            )}
          </div>

          {/* Location Capture */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Lokasi <span className="text-red-500">*</span>
            </label>
            {clockInLocation ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                  Lokasi berhasil diambil
                </div>
                <p className="text-xs text-slate-400">
                  Lat: {clockInLocation.lat.toFixed(6)}, Lon: {clockInLocation.lon.toFixed(6)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => captureLocation(setClockInLocation)}
                >
                  Ambil Ulang Lokasi
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => captureLocation(setClockInLocation)}
                className="w-full"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Ambil Lokasi
              </Button>
            )}
          </div>

          <Button
            onClick={handleClockIn}
            variant="primary"
            size="lg"
            isLoading={submitting}
            disabled={!shiftStartTime || !clockInPhoto || !clockInLocation}
            fullWidth
            className="active:scale-[0.98] transition-transform duration-150"
          >
            <Clock className="w-5 h-5 mr-2" />
            Clock In
          </Button>
        </motion.div>
      )}

      {/* Clock Out Form (when clocked in) */}
      {activeShift && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06)] p-4 space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Sedang Bertugas</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Clock in: {formatDate(activeShift.clockInAt)}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
            <p className="text-sm text-blue-800">
              Lengkapi langkah berikut untuk clock out
            </p>
          </div>

          {/* Photo Capture */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Foto Selfie <span className="text-red-500">*</span>
            </label>
            {clockOutPhoto ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                  Foto berhasil diambil
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowClockOutCamera(true)}
                >
                  Ambil Ulang Foto
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowClockOutCamera(true)}
                className="w-full"
              >
                <Camera className="w-5 h-5 mr-2" />
                Ambil Foto Selfie
              </Button>
            )}
          </div>

          {/* Location Capture */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Lokasi <span className="text-red-500">*</span>
            </label>
            {clockOutLocation ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle className="w-5 h-5" />
                  Lokasi berhasil diambil
                </div>
                <p className="text-xs text-slate-400">
                  Lat: {clockOutLocation.lat.toFixed(6)}, Lon: {clockOutLocation.lon.toFixed(6)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => captureLocation(setClockOutLocation)}
                >
                  Ambil Ulang Lokasi
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => captureLocation(setClockOutLocation)}
                className="w-full"
              >
                <MapPin className="w-5 h-5 mr-2" />
                Ambil Lokasi
              </Button>
            )}
          </div>

          <Button
            onClick={handleClockOut}
            variant="primary"
            size="lg"
            isLoading={submitting}
            disabled={!clockOutPhoto || !clockOutLocation}
            fullWidth
            className="active:scale-[0.98] transition-transform duration-150"
          >
            <Clock className="w-5 h-5 mr-2" />
            Clock Out
          </Button>
        </motion.div>
      )}

      {/* Camera Modals */}
      {showClockInCamera && (
        <CameraCapture
          onCapture={(file) => {
            setClockInPhoto(file);
            setShowClockInCamera(false);
          }}
          onClose={() => setShowClockInCamera(false)}
        />
      )}

      {showClockOutCamera && (
        <CameraCapture
          onCapture={(file) => {
            setClockOutPhoto(file);
            setShowClockOutCamera(false);
          }}
          onClose={() => setShowClockOutCamera(false)}
        />
      )}
    </motion.div>
  );
}
