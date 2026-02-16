"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";
import { formatCurrency } from "@/lib/utils";
import { calculateTotalPayment, getMonthOptions } from "@/lib/calculations";

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
  houseType?: { typeName: string; price: unknown };
}

interface AdminCreatePaymentFormProps {
  users: User[];
  onSubmit: (formData: FormData) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export default function AdminCreatePaymentForm({
  users,
  onSubmit,
  onCancel,
  isSubmitting,
}: AdminCreatePaymentFormProps) {
  const t = useTranslations('payments.form');
  const tAdmin = useTranslations('payments.admin');
  const tCommon = useTranslations('common');
  const [selectedUserId, setSelectedUserId] = useState("");
  const [houses, setHouses] = useState<House[]>([]);
  const [selectedHouseId, setSelectedHouseId] = useState("");
  const [amountMonths, setAmountMonths] = useState(1);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [isLoadingHouses, setIsLoadingHouses] = useState(false);

  const nonAdminUsers = useMemo(
    () => users.filter((u) => u.role !== "ADMIN"),
    [users]
  );

  // Fetch houses when user changes
  useEffect(() => {
    if (!selectedUserId) {
      setHouses([]);
      setSelectedHouseId("");
      return;
    }
    setIsLoadingHouses(true);
    setSelectedHouseId("");
    fetch(`/api/houses?userId=${selectedUserId}`)
      .then((r) => r.json())
      .then((data) => {
        setHouses(data);
        setIsLoadingHouses(false);
      })
      .catch(() => {
        setHouses([]);
        setIsLoadingHouses(false);
      });
  }, [selectedUserId]);

  const selectedHouse = useMemo(
    () => houses.find((h) => h.id === selectedHouseId) ?? null,
    [houses, selectedHouseId]
  );

  const monthlyRate = selectedHouse?.houseType?.price != null
    ? Number(selectedHouse.houseType.price)
    : 0;

  const totalAmount = selectedHouse && monthlyRate > 0
    ? calculateTotalPayment(monthlyRate, amountMonths)
    : 0;

  const monthOptions = getMonthOptions();
  const isValid = selectedUserId && selectedHouseId && amountMonths >= 1 && proofImage;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const fd = new FormData();
    fd.append("userId", selectedUserId);
    fd.append("houseId", selectedHouseId);
    fd.append("amountMonths", String(amountMonths));
    fd.append("proofImage", proofImage!);
    onSubmit(fd);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* User select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('resident')} <span className="text-danger-500">*</span>
        </label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-4 py-3 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100 disabled:opacity-50"
        >
          <option value="">{t('select_resident')}</option>
          {nonAdminUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>
      </div>

      {/* House select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('house')} <span className="text-danger-500">*</span>
        </label>
        <select
          value={selectedHouseId}
          onChange={(e) => setSelectedHouseId(e.target.value)}
          disabled={!selectedUserId || isLoadingHouses || isSubmitting}
          className="w-full px-4 py-3 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100 disabled:opacity-50"
        >
          <option value="">
            {isLoadingHouses ? tCommon('actions.loading') : !selectedUserId ? t('select_resident_first') : houses.length === 0 ? t('no_houses_assigned') : t('select_house')}
          </option>
          {houses.map((h) => (
            <option key={h.id} value={h.id}>
              {h.houseNumber} – {t('house')} {h.block} ({h.houseType?.typeName})
            </option>
          ))}
        </select>
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
