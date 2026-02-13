"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Loader2 } from "lucide-react";

const geofenceSchema = z.object({
  radiusMeters: z.number().int().min(1).max(1000),
  centerLat: z.number().min(-90).max(90),
  centerLon: z.number().min(-180).max(180),
});

type GeofenceFormData = z.infer<typeof geofenceSchema>;

interface GeofenceConfigFormProps {
  initialConfig: GeofenceFormData;
  onSaveSuccess: (config: GeofenceFormData) => void;
  onSaveError: (errorMessage: string) => void;
}

export function GeofenceConfigForm({
  initialConfig,
  onSaveSuccess,
  onSaveError,
}: GeofenceConfigFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<GeofenceFormData>({
    resolver: zodResolver(geofenceSchema),
    defaultValues: initialConfig,
  });

  const radiusMeters = watch("radiusMeters");
  const centerLat = watch("centerLat");
  const centerLon = watch("centerLon");

  const onSubmit = async (data: GeofenceFormData) => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/system-config/geofence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan konfigurasi");
      }

      onSaveSuccess(data);
    } catch (error) {
      console.error("Error saving geofence config:", error);
      onSaveError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan konfigurasi"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Radius Input */}
      <div>
        <label
          htmlFor="radiusMeters"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Radius Geofence (meter)
        </label>
        <input
          type="number"
          id="radiusMeters"
          {...register("radiusMeters", { valueAsNumber: true })}
          min={1}
          max={1000}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            errors.radiusMeters ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.radiusMeters && (
          <p className="text-sm text-red-600 mt-1">
            {errors.radiusMeters.message}
          </p>
        )}
        <p className="text-sm text-gray-600 mt-1">
          Staff harus berada dalam radius {radiusMeters}m dari titik pusat
          untuk absen
        </p>
      </div>

      {/* Latitude Input */}
      <div>
        <label
          htmlFor="centerLat"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Latitude Pusat Kantor
        </label>
        <input
          type="number"
          id="centerLat"
          {...register("centerLat", { valueAsNumber: true })}
          step="0.000001"
          min={-90}
          max={90}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            errors.centerLat ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.centerLat && (
          <p className="text-sm text-red-600 mt-1">
            {errors.centerLat.message}
          </p>
        )}
      </div>

      {/* Longitude Input */}
      <div>
        <label
          htmlFor="centerLon"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Longitude Pusat Kantor
        </label>
        <input
          type="number"
          id="centerLon"
          {...register("centerLon", { valueAsNumber: true })}
          step="0.000001"
          min={-180}
          max={180}
          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
            errors.centerLon ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.centerLon && (
          <p className="text-sm text-red-600 mt-1">
            {errors.centerLon.message}
          </p>
        )}
      </div>

      {/* Preview Section */}
      {!errors.radiusMeters && !errors.centerLat && !errors.centerLon && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700 mb-2">
            <MapPin className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Konfigurasi Saat Ini:</span>
          </div>
          <ul className="text-sm text-gray-600 space-y-1 ml-7">
            <li>
              Radius:{" "}
              <span className="font-semibold text-blue-600">
                {radiusMeters}m
              </span>
            </li>
            <li>
              Koordinat Pusat:{" "}
              <span className="font-mono">
                {centerLat}, {centerLon}
              </span>
            </li>
          </ul>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </button>
      </div>
    </form>
  );
}
