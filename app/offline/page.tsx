"use client";

import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function OfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col max-w-md mx-auto">
      {/* Status bar spacer */}
      <div className="h-12 bg-white flex-shrink-0" />

      {/* Header */}
      <header className="bg-white px-4 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-slate-800">IPL Manager</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full space-y-6 text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex justify-center"
          >
            <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center">
              <WifiOff className="w-10 h-10 text-slate-400" />
            </div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="space-y-2"
          >
            <h1 className="text-xl font-bold text-slate-900">Tidak Ada Koneksi</h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              Periksa koneksi internet Anda dan coba lagi. Data yang sudah dimuat
              sebelumnya mungkin masih tersedia.
            </p>
          </motion.div>

          {/* Status indicator */}
          {isOnline && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 rounded-2xl px-4 py-3"
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-sm font-medium text-emerald-600">
                  Koneksi kembali — klik Coba Lagi
                </p>
              </div>
            </motion.div>
          )}

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="space-y-3"
          >
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-blue-600 text-white rounded-2xl p-4 flex items-center justify-center gap-2.5 font-semibold text-sm active:scale-[0.98] transition-all duration-150 disabled:bg-blue-400"
            >
              <motion.div
                animate={isRetrying ? { rotate: 360 } : { rotate: 0 }}
                transition={isRetrying ? { duration: 0.6, ease: "linear" } : {}}
              >
                <RefreshCw className="w-4 h-4" />
              </motion.div>
              {isRetrying ? "Menghubungkan..." : "Coba Lagi"}
            </button>

            <Link
              href="/user/dashboard"
              className="w-full bg-white text-slate-600 rounded-2xl p-4 flex items-center justify-center gap-2.5 font-medium text-sm active:scale-[0.98] transition-all duration-150 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
            >
              <Home className="w-4 h-4" />
              Kembali ke Beranda
            </Link>
          </motion.div>

          {/* Hint */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-xs text-slate-400"
          >
            Beberapa halaman mungkin tersedia dari cache
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
