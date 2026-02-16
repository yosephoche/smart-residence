"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { UploadWindowConfigForm } from "@/components/forms/UploadWindowConfigForm";
import { DefaultPasswordConfigForm } from "@/components/forms/DefaultPasswordConfigForm";
import { GeofenceConfigForm } from "@/components/forms/GeofenceConfigForm";
import { Settings, AlertCircle, CheckCircle, Key, MapPin } from "lucide-react";

export const dynamic = 'force-dynamic';

interface UploadWindowConfig {
  enabled: boolean;
  startDay: number;
  endDay: number;
}

interface DefaultPasswordConfig {
  defaultPassword: string;
}

interface GeofenceConfig {
  radiusMeters: number;
  centerLat: number;
  centerLon: number;
}

export default function SettingsPage() {
  const t = useTranslations('settings');
  const [uploadWindowConfig, setUploadWindowConfig] =
    useState<UploadWindowConfig | null>(null);
  const [defaultPasswordConfig, setDefaultPasswordConfig] =
    useState<DefaultPasswordConfig | null>(null);
  const [geofenceConfig, setGeofenceConfig] = useState<GeofenceConfig | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const [uploadResponse, passwordResponse, geofenceResponse] =
        await Promise.all([
          fetch("/api/system-config/upload-window"),
          fetch("/api/system-config/default-password"),
          fetch("/api/system-config/geofence"),
        ]);

      if (!uploadResponse.ok || !passwordResponse.ok || !geofenceResponse.ok) {
        throw new Error("Failed to fetch configurations");
      }

      const [uploadData, passwordData, geofenceData] = await Promise.all([
        uploadResponse.json(),
        passwordResponse.json(),
        geofenceResponse.json(),
      ]);

      setUploadWindowConfig(uploadData);
      setDefaultPasswordConfig(passwordData);
      setGeofenceConfig(geofenceData);
    } catch (error) {
      console.error("Error fetching configs:", error);
      setAlert({
        type: "error",
        message: t('load_error'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUploadWindowSaveSuccess = (config: UploadWindowConfig) => {
    setUploadWindowConfig(config);
    setAlert({
      type: "success",
      message: t('upload_window_saved'),
    });

    // Auto-dismiss success message after 5 seconds
    setTimeout(() => setAlert(null), 5000);
  };

  const handlePasswordSaveSuccess = (config: DefaultPasswordConfig) => {
    setDefaultPasswordConfig(config);
    setAlert({
      type: "success",
      message: t('password_saved'),
    });

    // Auto-dismiss success message after 5 seconds
    setTimeout(() => setAlert(null), 5000);
  };

  const handleGeofenceSaveSuccess = (config: GeofenceConfig) => {
    setGeofenceConfig(config);
    setAlert({
      type: "success",
      message: t('geofence_saved'),
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
          {t('title')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('subtitle')}
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
              onSaveSuccess={handleUploadWindowSaveSuccess}
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

      {/* Default Password Configuration */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mt-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Password Default User Baru
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Atur password default yang akan digunakan saat membuat user baru
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : defaultPasswordConfig ? (
            <DefaultPasswordConfigForm
              initialConfig={defaultPasswordConfig}
              onSaveSuccess={handlePasswordSaveSuccess}
              onSaveError={handleSaveError}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              Gagal memuat konfigurasi
            </div>
          )}
        </div>

        {/* Important Notes */}
        <div className="p-6 bg-yellow-50 border-t border-yellow-200">
          <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Informasi Penting
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1 ml-6 list-disc">
            <li>
              Password ini akan digunakan untuk semua user baru yang dibuat
            </li>
            <li>User akan dipaksa untuk mengganti password saat login pertama kali</li>
            <li>
              Password minimum 6 karakter untuk keamanan
            </li>
            <li>
              Perubahan password tidak mempengaruhi user yang sudah ada
            </li>
          </ul>
        </div>
      </div>

      {/* Geofence Configuration */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mt-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Geofence Absensi Staff
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Atur lokasi pusat dan radius untuk validasi lokasi absensi staff
          </p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ) : geofenceConfig ? (
            <GeofenceConfigForm
              initialConfig={geofenceConfig}
              onSaveSuccess={handleGeofenceSaveSuccess}
              onSaveError={handleSaveError}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              Gagal memuat konfigurasi
            </div>
          )}
        </div>

        <div className="p-6 bg-amber-50 border-t border-amber-200">
          <h3 className="font-medium text-amber-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Cara Mendapatkan Koordinat
          </h3>
          <ul className="text-sm text-amber-800 space-y-1 ml-6 list-disc">
            <li>Buka Google Maps, cari lokasi kantor/residence Anda</li>
            <li>
              Klik kanan pada titik tengah lokasi, pilih &quot;What&apos;s
              here?&quot;
            </li>
            <li>
              Koordinat akan muncul di bagian bawah (format: -6.2088, 106.8456)
            </li>
            <li>
              Angka pertama adalah Latitude, angka kedua adalah Longitude
            </li>
            <li>
              Radius yang direkomendasikan: 50-200 meter tergantung ukuran area
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
