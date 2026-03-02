"use client";

import { useState } from "react";

interface LeaveConfig {
  maxDaysPerRequest: number;
  minAdvanceDays: number;
}

interface LeaveConfigFormProps {
  initialConfig: LeaveConfig;
  onSaveSuccess: (config: LeaveConfig) => void;
  onSaveError: (message: string) => void;
}

export default function LeaveConfigForm({
  initialConfig,
  onSaveSuccess,
  onSaveError,
}: LeaveConfigFormProps) {
  const [maxDays, setMaxDays] = useState(initialConfig.maxDaysPerRequest);
  const [minAdvance, setMinAdvance] = useState(initialConfig.minAdvanceDays);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/system-config/leave-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maxDaysPerRequest: maxDays,
          minAdvanceDays: minAdvance,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      onSaveSuccess({ maxDaysPerRequest: maxDays, minAdvanceDays: minAdvance });
    } catch (err: any) {
      onSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Maksimum Hari per Pengajuan
        </label>
        <input
          type="number"
          min={1}
          max={30}
          value={maxDays}
          onChange={(e) => setMaxDays(parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Staf tidak dapat mengajukan cuti lebih dari {maxDays} hari dalam satu pengajuan
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Minimum Hari Pengajuan Sebelumnya
        </label>
        <input
          type="number"
          min={1}
          max={60}
          value={minAdvance}
          onChange={(e) => setMinAdvance(parseInt(e.target.value) || 1)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Staf harus mengajukan cuti minimal {minAdvance} hari sebelum tanggal mulai
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
      >
        {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
      </button>
    </form>
  );
}
