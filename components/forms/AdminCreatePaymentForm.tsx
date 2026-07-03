"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { formatCurrency } from "@/lib/utils";
import { calculateTotalPayment, formatPaymentMonth, type YearMonth } from "@/lib/calculations";

interface HouseUser {
  id: string;
  name: string;
  email: string;
}

interface ArrearsInfo {
  enabled: boolean;
  unpaidMonths: YearMonth[];
  excludedPeriods: YearMonth[];
  monthlyRate: number;
  totalArrears: number;
}

interface MonthOption {
  value: YearMonth;
  isArrears: boolean;
}

interface HouseWithUser {
  id: string;
  houseNumber: string;
  block: string;
  userId: string | null;
  houseType?: { typeName: string; price: unknown };
  user?: HouseUser | null;
}

interface AdminCreatePaymentFormProps {
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function AdminCreatePaymentForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: AdminCreatePaymentFormProps) {
  const t = useTranslations('payments.form');
  const tAdmin = useTranslations('payments.admin');
  const tCommon = useTranslations('common');

  const [allHouses, setAllHouses] = useState<HouseWithUser[]>([]);
  const [isLoadingHouses, setIsLoadingHouses] = useState(true);
  const [blockFilter, setBlockFilter] = useState("");
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [arrears, setArrears] = useState<ArrearsInfo | null>(null);
  const [occupiedMonths, setOccupiedMonths] = useState<YearMonth[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<YearMonth[]>([]);
  const [isLoadingMonths, setIsLoadingMonths] = useState(false);

  // Fetch all occupied houses with user info on mount
  useEffect(() => {
    setIsLoadingHouses(true);
    fetch("/api/houses?includeUser=true")
      .then((r) => r.json())
      .then((data: HouseWithUser[]) => {
        // Only keep houses that have an assigned resident
        setAllHouses(data.filter((h) => h.userId !== null));
        setIsLoadingHouses(false);
      })
      .catch(() => {
        setAllHouses([]);
        setIsLoadingHouses(false);
      });
  }, []);

  // Unique sorted blocks derived from allHouses
  const uniqueBlocks = useMemo(() => {
    const blocks = new Set(allHouses.map((h) => h.block));
    return Array.from(blocks).sort();
  }, [allHouses]);

  // Houses filtered by block selection
  const filteredHouses = useMemo(() => {
    if (!blockFilter) return allHouses;
    return allHouses.filter((h) => h.block === blockFilter);
  }, [allHouses, blockFilter]);

  // SearchableSelect options
  const houseOptions = useMemo(
    () =>
      filteredHouses.map((h) => ({
        value: h.id,
        label: `No. ${h.houseNumber} – Blok ${h.block} (${h.houseType?.typeName ?? "-"})`,
        searchText: `${h.houseNumber} ${h.block}`,
      })),
    [filteredHouses]
  );

  // Selected house object
  const selectedHouse = useMemo(
    () => allHouses.find((h) => h.id === selectedHouseId) ?? null,
    [allHouses, selectedHouseId]
  );

  const monthlyRate = selectedHouse?.houseType?.price != null
    ? Number(selectedHouse.houseType.price)
    : 0;

  const totalAmount = selectedHouse && monthlyRate > 0 && selectedMonths.length > 0
    ? calculateTotalPayment(monthlyRate, selectedMonths.length)
    : 0;

  // Fetch arrears + occupied months when house changes; pre-select arrears months
  useEffect(() => {
    if (!selectedHouseId) {
      setArrears(null);
      setOccupiedMonths([]);
      setSelectedMonths([]);
      return;
    }
    setIsLoadingMonths(true);
    Promise.all([
      fetch(`/api/payments/unpaid-months?houseId=${selectedHouseId}`).then((r) => r.json()),
      fetch(`/api/payments/occupied-months?houseId=${selectedHouseId}`).then((r) => r.json()),
    ])
      .then(([arrearsData, occupiedData]) => {
        setArrears(arrearsData);
        setOccupiedMonths(Array.isArray(occupiedData) ? occupiedData : []);
        if (arrearsData?.enabled && arrearsData.unpaidMonths.length > 0) {
          setSelectedMonths(arrearsData.unpaidMonths.slice(0, 12));
        } else {
          setSelectedMonths([]);
        }
      })
      .catch(() => {
        setArrears(null);
        setOccupiedMonths([]);
        setSelectedMonths([]);
      })
      .finally(() => setIsLoadingMonths(false));
  }, [selectedHouseId]);

  // Month options: arrears months (amber) + upcoming months (blue)
  const monthChoices = useMemo<MonthOption[]>(() => {
    if (!selectedHouseId) return [];

    const isIn = (list: YearMonth[], m: YearMonth) =>
      list.some((x) => x.year === m.year && x.month === m.month);

    const options: MonthOption[] = (arrears?.enabled ? arrears.unpaidMonths : []).map(
      (m) => ({ value: m, isArrears: true })
    );

    const excluded = arrears?.excludedPeriods ?? [];
    const now = new Date();
    let cursor: YearMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };
    let guard = 0;
    while (options.length < 18 && guard < 60) {
      if (
        !isIn(occupiedMonths, cursor) &&
        !isIn(excluded, cursor) &&
        !options.some((o) => o.value.year === cursor.year && o.value.month === cursor.month)
      ) {
        options.push({ value: cursor, isArrears: false });
      }
      cursor = cursor.month >= 12
        ? { year: cursor.year + 1, month: 1 }
        : { year: cursor.year, month: cursor.month + 1 };
      guard++;
    }
    return options;
  }, [selectedHouseId, arrears, occupiedMonths]);

  const toggleMonth = (m: YearMonth) => {
    setSelectedMonths((prev) => {
      const exists = prev.some((p) => p.year === m.year && p.month === m.month);
      if (exists) {
        return prev.filter((p) => !(p.year === m.year && p.month === m.month));
      }
      if (prev.length >= 12) return prev;
      // Keep chronological order
      return [...prev, m].sort((a, b) => a.year - b.year || a.month - b.month);
    });
  };

  const hasArrears = !!arrears?.enabled && arrears.unpaidMonths.length > 0;

  // Reset house selection when block filter changes
  const handleBlockChange = (block: string) => {
    setBlockFilter(block);
    setSelectedHouseId("");
  };

  const isValid =
    selectedHouseId && selectedHouse?.userId && selectedMonths.length >= 1 && proofImage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const fd = new FormData();
    fd.append("userId", selectedHouse!.user!.id);
    fd.append("houseId", selectedHouseId);
    fd.append("amountMonths", String(selectedMonths.length));
    fd.append("months", JSON.stringify(selectedMonths));
    fd.append("proofImage", proofImage!);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Block filter */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 tracking-tight">
          {t('filter_block')}
        </label>
        <select
          value={blockFilter}
          onChange={(e) => handleBlockChange(e.target.value)}
          disabled={isLoadingHouses || isSubmitting}
          className="w-full px-4 py-3 text-sm text-slate-900 bg-white border-2 border-slate-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100 disabled:opacity-50"
        >
          <option value="">{t('all_blocks')}</option>
          {uniqueBlocks.map((block) => (
            <option key={block} value={block}>
              Blok {block}
            </option>
          ))}
        </select>
      </div>

      {/* House searchable select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 tracking-tight">
          {t('house')} <span className="text-danger-500">*</span>
        </label>
        <SearchableSelect
          options={houseOptions}
          value={selectedHouseId}
          onChange={setSelectedHouseId}
          placeholder={isLoadingHouses ? tCommon('actions.loading') : t('select_house')}
          emptyMessage={t('no_occupied_houses')}
          disabled={isLoadingHouses || isSubmitting}
        />
      </div>

      {/* Resident info (auto-filled) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 tracking-tight">
          {t('resident_info')}
        </label>
        {selectedHouse?.user ? (
          <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900">{selectedHouse.user.name}</p>
            <p className="text-xs text-blue-600 mt-0.5">{selectedHouse.user.email}</p>
          </div>
        ) : (
          <div className="px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg">
            <p className="text-sm text-slate-400 italic">
              {selectedHouseId ? t('no_resident') : t('select_house')}
            </p>
          </div>
        )}
      </div>

      {/* Arrears summary banner */}
      {hasArrears && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800">
            Tunggakan {arrears!.unpaidMonths.length} bulan · {formatCurrency(arrears!.totalArrears)}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Bulan menunggak otomatis tercentang. Sesuaikan pilihan bila perlu.
          </p>
        </div>
      )}

      {/* Month checkbox grid */}
      {selectedHouseId && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 tracking-tight">
            Pilih Bulan <span className="text-danger-500">*</span>
          </label>
          {isLoadingMonths ? (
            <p className="text-sm text-slate-400 py-2">{tCommon('actions.loading')}</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {monthChoices.map(({ value: m, isArrears }) => {
                  const isSelected = selectedMonths.some(
                    (p) => p.year === m.year && p.month === m.month
                  );
                  const atCap = !isSelected && selectedMonths.length >= 12;
                  return (
                    <button
                      key={`${m.year}-${m.month}`}
                      type="button"
                      onClick={() => toggleMonth(m)}
                      disabled={isSubmitting || atCap}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border-2 transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${
                        isSelected
                          ? isArrears
                            ? "bg-amber-100 text-amber-800 border-amber-400"
                            : "bg-primary-100 text-primary-800 border-primary-400"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {formatPaymentMonth(m)}
                      {isArrears && (
                        <span className="text-[10px] font-semibold bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                          Tunggakan
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500">
                {selectedMonths.length} bulan dipilih (maks 12)
              </p>
            </>
          )}
        </div>
      )}

      {/* Total preview panel */}
      {selectedHouse && monthlyRate > 0 && selectedMonths.length > 0 && (
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700">{t('total_amount')}</p>
              <p className="text-xs text-primary-600 mt-0.5">
                {formatCurrency(monthlyRate)} &times; {selectedMonths.length} {t('months_label')}
              </p>
            </div>
            <p className="text-2xl font-bold text-primary-900">
              {formatCurrency(totalAmount)}
            </p>
          </div>
          <p className="text-xs text-primary-600 mt-2">
            {selectedMonths.map((m) => formatPaymentMonth(m)).join(", ")}
          </p>
        </div>
      )}

      {/* File upload */}
      <FileUpload
        label={t('proof_image')}
        required
        onChange={setProofImage}
        value={proofImage}
        helperText={t('upload_proof_help')}
        disabled={isSubmitting}
      />

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
          {tCommon('actions.cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          disabled={!isValid || isSubmitting}
          fullWidth
        >
          {tAdmin('create_payment')}
        </Button>
      </div>
    </form>
  );
}
