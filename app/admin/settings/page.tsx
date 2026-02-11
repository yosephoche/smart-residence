"use client";

import { useEffect, useState } from "react";
import { UploadWindowConfigForm } from "@/components/forms/UploadWindowConfigForm";
import { Settings, AlertCircle, CheckCircle } from "lucide-react";

interface UploadWindowConfig {
  enabled: boolean;
  startDay: number;
  endDay: number;
}

export default function SettingsPage() {
  const [uploadWindowConfig, setUploadWindowConfig] =
    useState<UploadWindowConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchUploadWindowConfig();
  }, []);

  const fetchUploadWindowConfig = async () => {
    try {
      const response = await fetch("/api/system-config/upload-window");
      if (!response.ok) throw new Error("Failed to fetch configuration");
      const data = await response.json();
      setUploadWindowConfig(data);
    } catch (error) {
      console.error("Error fetching upload window config:", error);
      setAlert({
        type: "error",
        message: "Gagal memuat konfigurasi. Silakan refresh halaman.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSuccess = (config: UploadWindowConfig) => {
    setUploadWindowConfig(config);
    setAlert({
      type: "success",
      message: "Konfigurasi berhasil disimpan.",
    });

    // Auto-dismiss success message after 5 seconds
    setTimeout(() => setAlert(null), 5000);
  };

  const handleSaveError = (errorMessage: string) => {
    setAlert({
      type: "error",
      message: errorMessage,
    });
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-7 h-7" />
          Pengaturan Sistem
        </h1>
        <p className="text-gray-600 mt-1">
          Kelola pengaturan sistem aplikasi
        </p>
      </div>

      {/* Alert Messages */}
      {alert && (
        <div
          className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
            alert.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">{alert.message}</p>
          </div>
          <button
            onClick={() => setAlert(null)}
            className="ml-auto text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Upload Window Configuration */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Periode Upload Pembayaran
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Atur pembatasan waktu upload bukti pembayaran untuk user
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded w-1/2"></div>
              <div className="h-12 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : uploadWindowConfig ? (
            <UploadWindowConfigForm
              initialConfig={uploadWindowConfig}
              onSaveSuccess={handleSaveSuccess}
              onSaveError={handleSaveError}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              Gagal memuat konfigurasi
            </div>
          )}
        </div>

        {/* Important Notes */}
        <div className="p-6 bg-blue-50 border-t border-blue-200">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Informasi Penting
          </h3>
          <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
            <li>
              Jika pembatasan diaktifkan, user hanya dapat upload pada tanggal
              yang ditentukan
            </li>
            <li>Admin tetap dapat membuat pembayaran kapan saja</li>
            <li>
              Perubahan konfigurasi akan langsung berlaku untuk semua user
            </li>
            <li>
              Jika pembatasan dinonaktifkan, user dapat upload kapan saja
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
