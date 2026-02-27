"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { formatCurrency } from "@/lib/utils";
import { calculateTotalPayment, getMonthOptions } from "@/lib/calculations";

interface HouseUser {
  id: string;
  name: string;
  email: string;
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
  const [amountMonths, setAmountMonths] = useState(1);
  const [proofImage, setProofImage] = useState<File | null>(null);

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

  const totalAmount = selectedHouse && monthlyRate > 0
    ? calculateTotalPayment(monthlyRate, amountMonths)
    : 0;

  const monthOptions = getMonthOptions();

  // Reset house selection when block filter changes
  const handleBlockChange = (block: string) => {
    setBlockFilter(block);
    setSelectedHouseId("");
  };

  const isValid = selectedHouseId && selectedHouse?.userId && amountMonths >= 1 && proofImage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const fd = new FormData();
    fd.append("userId", selectedHouse!.user!.id);
    fd.append("houseId", selectedHouseId);
    fd.append("amountMonths", String(amountMonths));
    fd.append("proofImage", proofImage!);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Block filter */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('filter_block')}
        </label>
        <select
          value={blockFilter}
          onChange={(e) => handleBlockChange(e.target.value)}
          disabled={isLoadingHouses || isSubmitting}
          className="w-full px-4 py-3 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100 disabled:opacity-50"
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
        <label className="text-sm font-medium text-gray-700 tracking-tight">
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
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('resident_info')}
        </label>
        {selectedHouse?.user ? (
          <div className="px-4 py-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm font-semibold text-blue-900">{selectedHouse.user.name}</p>
            <p className="text-xs text-blue-600 mt-0.5">{selectedHouse.user.email}</p>
          </div>
        ) : (
          <div className="px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
            <p className="text-sm text-gray-400 italic">
              {selectedHouseId ? t('no_resident') : t('select_house')}
            </p>
          </div>
        )}
      </div>

      {/* Amount months select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('number_of_months')} <span className="text-danger-500">*</span>
        </label>
        <select
          value={amountMonths}
          onChange={(e) => setAmountMonths(parseInt(e.target.value))}
          disabled={isSubmitting}
          className="w-full px-4 py-3 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100 disabled:opacity-50"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Total preview panel */}
      {selectedHouse && monthlyRate > 0 && (
        <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary-700">{t('total_amount')}</p>
              <p className="text-xs text-primary-600 mt-0.5">
                {formatCurrency(monthlyRate)} &times; {amountMonths} {t('months_label')}
              </p>
            </div>
            <p className="text-2xl font-bold text-primary-900">
              {formatCurrency(totalAmount)}
            </p>
          </div>
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
