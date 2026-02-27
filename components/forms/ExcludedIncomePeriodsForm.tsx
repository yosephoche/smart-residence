"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { X, Plus } from "lucide-react";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface Period {
  year: number;
  month: number;
}

interface Props {
  initialConfig: { periods: Period[] };
  onSaveSuccess: (config: { periods: Period[] }) => void;
  onSaveError: (message: string) => void;
}

export default function ExcludedIncomePeriodsForm({
  initialConfig,
  onSaveSuccess,
  onSaveError,
}: Props) {
  const [periods, setPeriods] = useState<Period[]>(initialConfig.periods);
  const [addYear, setAddYear] = useState(new Date().getFullYear());
  const [addMonth, setAddMonth] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const handleAdd = () => {
    const isDuplicate = periods.some((p) => p.year === addYear && p.month === addMonth);
    if (isDuplicate) return;
    setPeriods((prev) => [...prev, { year: addYear, month: addMonth }]);
  };

  const handleRemove = (year: number, month: number) => {
    setPeriods((prev) => prev.filter((p) => !(p.year === year && p.month === month)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/system-config/excluded-income-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periods }),
      });

      if (!res.ok) {
        const err = await res.json();
        onSaveError(err.error || "Gagal menyimpan konfigurasi");
        return;
      }

      const data = await res.json();
      onSaveSuccess({ periods: data.periods });
    } catch {
      onSaveError("Gagal menyimpan konfigurasi");
    } finally {
      setIsSaving(false);
    }
  };

  const isDuplicateAdd = periods.some((p) => p.year === addYear && p.month === addMonth);

  return (
    <div className="space-y-5">
      {/* Current excluded periods */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Periode yang dikecualikan ({periods.length})
        </p>
        {periods.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Belum ada periode yang dikecualikan. Semua pembayaran yang disetujui akan dibuat sebagai pemasukan.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {periods
              .slice()
              .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
              .map((p) => (
                <span
                  key={`${p.year}-${p.month}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium rounded-full"
                >
                  {MONTH_NAMES[p.month - 1]} {p.year}
                  <button
                    type="button"
                    onClick={() => handleRemove(p.year, p.month)}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-amber-200 transition-colors"
                    aria-label={`Hapus ${MONTH_NAMES[p.month - 1]} ${p.year}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Add period */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Tambah periode baru</p>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={addMonth}
            onChange={(e) => setAddMonth(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={addYear}
            onChange={(e) => setAddYear(Number(e.target.value))}
            className="px-3 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handleAdd}
            disabled={isDuplicateAdd}
          >
            <Plus className="w-4 h-4" />
            Tambah
          </Button>

          {isDuplicateAdd && (
            <span className="text-xs text-amber-600">Periode sudah ada</span>
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSave}
          isLoading={isSaving}
        >
          Simpan Konfigurasi
        </Button>
      </div>
    </div>
  );
}
