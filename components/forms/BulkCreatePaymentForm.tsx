"use client";

import { useState, useEffect, useMemo } from "react";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { CheckSquare, Square, Search } from "lucide-react";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface House {
  id: string;
  houseNumber: string;
  block: string;
  userId: string | null;
  houseType?: { typeName: string; price: unknown } | null;
}

interface Period {
  year: number;
  month: number;
}

interface BulkResult {
  succeeded: any[];
  failed: { houseId: string; reason: string }[];
}

interface Props {
  users: User[];
  onSuccess: (result: BulkResult) => void;
  onCancel: () => void;
}

function generateMonthOptions(): Period[] {
  const now = new Date();
  const result: Period[] = [];
  // Generate last 6 months + current month
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return result;
}

export default function BulkCreatePaymentForm({ users, onSuccess, onCancel }: Props) {
  const [houses, setHouses] = useState<House[]>([]);
  const [isLoadingHouses, setIsLoadingHouses] = useState(true);

  // Month selection (default: current month - 2, current month - 1)
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const defaultSelected = useMemo(() => {
    return monthOptions.slice(-2); // last 2 months
  }, [monthOptions]);
  const [selectedMonths, setSelectedMonths] = useState<Period[]>(defaultSelected);

  // House selection
  const [selectedHouseIds, setSelectedHouseIds] = useState<Set<string>>(new Set());
  const [houseSearch, setHouseSearch] = useState("");
  const [blockFilter, setBlockFilter] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all occupied houses
  useEffect(() => {
    setIsLoadingHouses(true);
    fetch("/api/houses")
      .then((r) => r.json())
      .then((data: House[]) => {
        setHouses(data.filter((h) => h.userId !== null));
        setIsLoadingHouses(false);
      })
      .catch(() => setIsLoadingHouses(false));
  }, []);

  // User lookup map
  const userMap = useMemo(() => {
    const m = new Map<string, User>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  // Available blocks for filter
  const blocks = useMemo(() => {
    const set = new Set<string>();
    houses.forEach((h) => set.add(h.block));
    return Array.from(set).sort();
  }, [houses]);

  // Filtered houses
  const filteredHouses = useMemo(() => {
    let list = houses;
    if (blockFilter) list = list.filter((h) => h.block === blockFilter);
    if (houseSearch.trim()) {
      const q = houseSearch.toLowerCase();
      list = list.filter((h) => {
        const user = h.userId ? userMap.get(h.userId) : null;
        return (
          h.houseNumber.toLowerCase().includes(q) ||
          h.block.toLowerCase().includes(q) ||
          h.houseType?.typeName.toLowerCase().includes(q) ||
          user?.name.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [houses, blockFilter, houseSearch, userMap]);

  // Toggle month
  const toggleMonth = (period: Period) => {
    setSelectedMonths((prev) => {
      const exists = prev.some((p) => p.year === period.year && p.month === period.month);
      if (exists) return prev.filter((p) => !(p.year === period.year && p.month === period.month));
      return [...prev, period];
    });
  };

  const isMonthSelected = (period: Period) =>
    selectedMonths.some((p) => p.year === period.year && p.month === period.month);

  // Toggle house
  const toggleHouse = (houseId: string) => {
    setSelectedHouseIds((prev) => {
      const next = new Set(prev);
      if (next.has(houseId)) next.delete(houseId);
      else next.add(houseId);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedHouseIds((prev) => {
      const next = new Set(prev);
      filteredHouses.forEach((h) => next.add(h.id));
      return next;
    });
  };

  const deselectAllVisible = () => {
    setSelectedHouseIds((prev) => {
      const next = new Set(prev);
      filteredHouses.forEach((h) => next.delete(h.id));
      return next;
    });
  };

  const allVisibleSelected =
    filteredHouses.length > 0 &&
    filteredHouses.every((h) => selectedHouseIds.has(h.id));

  // Summary by house type
  const summary = useMemo(() => {
    const selectedHouses = houses.filter((h) => selectedHouseIds.has(h.id));
    const typeMap = new Map<string, { typeName: string; count: number; pricePerMonth: number }>();

    selectedHouses.forEach((h) => {
      if (!h.houseType) return;
      const typeName = h.houseType.typeName;
      const price = Number(h.houseType.price);
      if (!typeMap.has(typeName)) {
        typeMap.set(typeName, { typeName, count: 0, pricePerMonth: price });
      }
      typeMap.get(typeName)!.count++;
    });

    return {
      types: Array.from(typeMap.values()),
      totalHouses: selectedHouses.length,
      totalMonths: selectedMonths.length,
      grandTotal: selectedHouses.reduce(
        (sum, h) => sum + Number(h.houseType?.price ?? 0) * selectedMonths.length,
        0
      ),
    };
  }, [houses, selectedHouseIds, selectedMonths]);

  const isValid = selectedHouseIds.size > 0 && selectedMonths.length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/payments/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          houseIds: Array.from(selectedHouseIds),
          months: selectedMonths,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat pembayaran");
      }

      onSuccess(data);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section 1: Month Selection */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          1. Pilih Bulan
          {selectedMonths.length > 0 && (
            <span className="ml-2 text-xs font-normal text-primary-600">
              ({selectedMonths.length} dipilih)
            </span>
          )}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {monthOptions.map((period) => {
            const selected = isMonthSelected(period);
            return (
              <button
                key={`${period.year}-${period.month}`}
                type="button"
                onClick={() => toggleMonth(period)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                  selected
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-700 border-gray-200 hover:border-primary-300"
                }`}
              >
                {MONTH_NAMES[period.month - 1].slice(0, 3)} {period.year}
              </button>
            );
          })}
        </div>
        {selectedMonths.length === 0 && (
          <p className="text-xs text-danger-500 mt-1">Pilih minimal satu bulan</p>
        )}
      </div>

      {/* Section 2: House Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">
            2. Pilih Rumah
            {selectedHouseIds.size > 0 && (
              <span className="ml-2 text-xs font-normal text-primary-600">
                ({selectedHouseIds.size} dipilih)
              </span>
            )}
          </h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllVisible}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              Pilih Semua
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={deselectAllVisible}
              className="text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Batal Semua
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari rumah atau penghuni..."
              value={houseSearch}
              onChange={(e) => setHouseSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
            />
          </div>
          {blocks.length > 1 && (
            <select
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-white border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none"
            >
              <option value="">Semua Blok</option>
              {blocks.map((b) => (
                <option key={b} value={b}>
                  Blok {b}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* House list */}
        {isLoadingHouses ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredHouses.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {houses.length === 0 ? "Belum ada rumah yang ditempati" : "Tidak ada rumah yang sesuai filter"}
          </p>
        ) : (
          <div className="max-h-52 overflow-y-auto rounded-lg border-2 border-gray-200">
            {/* Select all header */}
            <button
              type="button"
              onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
              className="w-full flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200 hover:bg-gray-100 transition-colors"
            >
              {allVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-primary-600 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span className="text-xs font-medium text-gray-600">
                {allVisibleSelected ? "Batal pilih semua" : "Pilih semua yang terlihat"} ({filteredHouses.length})
              </span>
            </button>

            {filteredHouses.map((house) => {
              const user = house.userId ? userMap.get(house.userId) : null;
              const selected = selectedHouseIds.has(house.id);
              return (
                <button
                  key={house.id}
                  type="button"
                  onClick={() => toggleHouse(house.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${
                    selected ? "bg-primary-50" : ""
                  }`}
                >
                  {selected ? (
                    <CheckSquare className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-300 flex-shrink-0" />
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {house.houseNumber} · Blok {house.block}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.name ?? "—"} · {house.houseType?.typeName ?? "—"}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 flex-shrink-0">
                    {house.houseType?.price != null
                      ? formatCurrency(Number(house.houseType.price)) + "/bln"
                      : "—"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        {selectedHouseIds.size === 0 && !isLoadingHouses && (
          <p className="text-xs text-danger-500 mt-1">Pilih minimal satu rumah</p>
        )}
      </div>

      {/* Section 3: Summary */}
      {summary.totalHouses > 0 && summary.totalMonths > 0 && (
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-primary-900">
            Ringkasan: {summary.totalHouses} rumah × {summary.totalMonths} bulan = {summary.totalHouses * summary.totalMonths} pembayaran
          </p>
          <div className="space-y-1">
            {summary.types.map((t) => (
              <div key={t.typeName} className="flex items-center justify-between text-xs text-primary-700">
                <span>
                  {t.typeName}: {t.count} rumah × {formatCurrency(t.pricePerMonth)} × {summary.totalMonths} bln
                </span>
                <span className="font-semibold">
                  {formatCurrency(t.count * t.pricePerMonth * summary.totalMonths)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-primary-200">
            <span className="text-sm font-semibold text-primary-900">Total</span>
            <span className="text-lg font-bold text-primary-900">
              {formatCurrency(summary.grandTotal)}
            </span>
          </div>
          <p className="text-xs text-primary-600 bg-primary-100 rounded-lg px-3 py-2 mt-1">
            Pembayaran akan langsung berstatus <strong>Disetujui</strong> tanpa memerlukan bukti transfer.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onCancel}
          disabled={isSubmitting}
          fullWidth
        >
          Batal
        </Button>
        <Button
          type="button"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          disabled={!isValid || isSubmitting}
          onClick={handleSubmit}
          fullWidth
        >
          Buat {summary.totalHouses > 0 && summary.totalMonths > 0
            ? `${summary.totalHouses * summary.totalMonths} Pembayaran`
            : "Pembayaran"}
        </Button>
      </div>
    </div>
  );
}
