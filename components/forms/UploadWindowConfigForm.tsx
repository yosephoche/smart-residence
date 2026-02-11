"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Loader2 } from "lucide-react";

const uploadWindowSchema = z
  .object({
    enabled: z.boolean(),
    startDay: z.number().int().min(1).max(31),
    endDay: z.number().int().min(1).max(31),
  })
  .refine((data) => data.startDay <= data.endDay, {
    message: "Tanggal mulai harus lebih kecil atau sama dengan tanggal akhir",
    path: ["endDay"],
  });

type UploadWindowFormData = z.infer<typeof uploadWindowSchema>;

interface UploadWindowConfigFormProps {
  initialConfig: UploadWindowFormData;
  onSaveSuccess: (config: UploadWindowFormData) => void;
  onSaveError: (errorMessage: string) => void;
}

export function UploadWindowConfigForm({
  initialConfig,
  onSaveSuccess,
  onSaveError,
}: UploadWindowConfigFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UploadWindowFormData>({
    resolver: zodResolver(uploadWindowSchema),
    defaultValues: initialConfig,
  });

  const enabled = watch("enabled");
  const startDay = watch("startDay");
  const endDay = watch("endDay");

  const onSubmit = async (data: UploadWindowFormData) => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/system-config/upload-window", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan konfigurasi");
      }

      const result = await response.json();
      onSaveSuccess(data);
    } catch (error) {
      console.error("Error saving upload window config:", error);
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
      {/* Enable/Disable Toggle */}
      <div className="flex items-start gap-4">
        <div className="flex items-center h-11">
          <input
            type="checkbox"
            id="enabled"
            {...register("enabled")}
            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="enabled" className="block font-medium text-gray-900">
            Aktifkan Pembatasan Periode Upload
          </label>
          <p className="text-sm text-gray-600 mt-1">
            {enabled
              ? `User hanya dapat upload pada tanggal ${startDay} - ${endDay} setiap bulan`
              : "User dapat upload bukti pembayaran kapan saja"}
          </p>
        </div>
      </div>

      {/* Date Range Inputs */}
      <div className="grid grid-cols-2 gap-4">
        {/* Start Day */}
        <div>
          <label
            htmlFor="startDay"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tanggal Mulai
          </label>
          <input
            type="number"
            id="startDay"
            {...register("startDay", { valueAsNumber: true })}
            disabled={!enabled}
            min={1}
            max={31}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              !enabled
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-white"
            } ${errors.startDay ? "border-red-500" : "border-gray-300"}`}
          />
          {errors.startDay && (
            <p className="text-sm text-red-600 mt-1">
              {errors.startDay.message}
            </p>
          )}
        </div>

        {/* End Day */}
        <div>
          <label
            htmlFor="endDay"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Tanggal Akhir
          </label>
          <input
            type="number"
            id="endDay"
            {...register("endDay", { valueAsNumber: true })}
            disabled={!enabled}
            min={1}
            max={31}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              !enabled
                ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                : "bg-white"
            } ${errors.endDay ? "border-red-500" : "border-gray-300"}`}
          />
          {errors.endDay && (
            <p className="text-sm text-red-600 mt-1">{errors.endDay.message}</p>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {enabled && !errors.startDay && !errors.endDay && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="font-medium">Preview:</span>
            <span>
              User dapat upload pada tanggal{" "}
              <span className="font-semibold text-blue-600">
                {startDay} - {endDay}
              </span>{" "}
              setiap bulan
            </span>
          </div>
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
