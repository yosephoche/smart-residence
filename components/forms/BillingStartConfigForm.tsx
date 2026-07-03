"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarClock, Loader2 } from "lucide-react";

const MONTH_NAMES_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const billingStartSchema = z.object({
  enabled: z.boolean(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
});

type BillingStartFormData = z.infer<typeof billingStartSchema>;

interface BillingStartConfigFormProps {
  initialConfig: BillingStartFormData;
  onSaveSuccess: (config: BillingStartFormData) => void;
  onSaveError: (errorMessage: string) => void;
}

export function BillingStartConfigForm({
  initialConfig,
  onSaveSuccess,
  onSaveError,
}: BillingStartConfigFormProps) {
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BillingStartFormData>({
    resolver: zodResolver(billingStartSchema),
    defaultValues: initialConfig,
  });

  const enabled = watch("enabled");
  const year = watch("year");
  const month = watch("month");

  const onSubmit = async (data: BillingStartFormData) => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/system-config/billing-start", {
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

      onSaveSuccess(data);
    } catch (error) {
      console.error("Error saving billing start config:", error);
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
            id="billingStartEnabled"
            {...register("enabled")}
            className="w-5 h-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="billingStartEnabled" className="block font-medium text-slate-900">
            Aktifkan Pelacakan Tunggakan
          </label>
          <p className="text-sm text-slate-600 mt-1">
            {enabled
              ? `Tunggakan dihitung mulai ${MONTH_NAMES_ID[(month ?? 1) - 1]} ${year}. Pembayaran user otomatis dialokasikan ke bulan tertunggak terlebih dahulu.`
              : "Pembayaran user dialokasikan mulai bulan berjalan (perilaku standar, tanpa tunggakan)"}
          </p>
        </div>
      </div>

      {/* Month & Year Inputs */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="billingStartMonth"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Bulan Mulai Tagihan
          </label>
          <select
            id="billingStartMonth"
            {...register("month", { valueAsNumber: true })}
            disabled={!enabled}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              !enabled
                ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                : "bg-white"
            } ${errors.month ? "border-red-500" : "border-slate-300"}`}
          >
            {MONTH_NAMES_ID.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          {errors.month && (
            <p className="text-sm text-red-600 mt-1">{errors.month.message}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="billingStartYear"
            className="block text-sm font-medium text-slate-700 mb-2"
          >
            Tahun
          </label>
          <input
            type="number"
            id="billingStartYear"
            {...register("year", { valueAsNumber: true })}
            disabled={!enabled}
            min={2000}
            max={2100}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              !enabled
                ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                : "bg-white"
            } ${errors.year ? "border-red-500" : "border-slate-300"}`}
          />
          {errors.year && (
            <p className="text-sm text-red-600 mt-1">{errors.year.message}</p>
          )}
        </div>
      </div>

      {/* Preview Section */}
      {enabled && !errors.year && !errors.month && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-700">
            <CalendarClock className="w-5 h-5 text-slate-500" />
            <span className="font-medium">Preview:</span>
            <span>
              Bulan belum dibayar sejak{" "}
              <span className="font-semibold text-blue-600">
                {MONTH_NAMES_ID[(month ?? 1) - 1]} {year}
              </span>{" "}
              dianggap tunggakan (kecuali periode pengecualian pre-launch)
            </span>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-slate-200">
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
