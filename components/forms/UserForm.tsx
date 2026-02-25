"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { userFormSchema, UserFormData } from "@/lib/validations/user.schema";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import SearchableSelect from "@/components/ui/SearchableSelect";
import type { SearchableSelectOption } from "@/components/ui/SearchableSelect";
import { User } from "@/types";

interface UserFormProps {
  user?: User;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function UserForm({
  user,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: UserFormProps) {
  const t = useTranslations('users.form');
  const tCommon = useTranslations('common');
  const isEditMode = !!user;
  const [availableHouses, setAvailableHouses] = useState<any[]>([]);
  const [isLoadingHouses, setIsLoadingHouses] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: user
      ? {
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone ?? "",
        }
      : {
          role: "USER",
          houseId: "",
          phone: "",
        },
  });

  const role = watch("role");
  const houseId = watch("houseId");
  const staffJobType = watch("staffJobType");

  // Fetch available houses on mount (only in create mode)
  useEffect(() => {
    if (!isEditMode) {
      setIsLoadingHouses(true);
      fetch("/api/houses/available")
        .then((r) => r.json())
        .then((data) => setAvailableHouses(data))
        .catch((err) => console.error("Failed to fetch houses:", err))
        .finally(() => setIsLoadingHouses(false));
    }
  }, [isEditMode]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label={t('full_name')}
        placeholder={t('name_placeholder')}
        error={errors.name?.message}
        {...register("name")}
        fullWidth
        required
      />

      <Input
        label={t('email_address')}
        type="email"
        placeholder={t('email_placeholder')}
        error={errors.email?.message}
        helperText={isEditMode ? t('email_readonly') : undefined}
        {...register("email")}
        fullWidth
        required
        disabled={isEditMode}
      />

      <Input
        label="Nomor HP"
        type="tel"
        placeholder="Contoh: 08123456789"
        error={errors.phone?.message}
        helperText="Opsional — digunakan untuk tombol WhatsApp"
        {...register("phone")}
        fullWidth
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('role')} <span className="text-danger-500 ml-1">*</span>
        </label>
        <select
          {...register("role")}
          className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
        >
          <option value="USER">{t('role_user')}</option>
          <option value="ADMIN">{t('role_admin')}</option>
          <option value="STAFF">{t('role_staff')}</option>
        </select>
        {errors.role && (
          <p className="text-xs text-danger-600">{errors.role.message}</p>
        )}
      </div>

      {!isEditMode && role === "STAFF" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 tracking-tight">
            {t('job_type')} <span className="text-danger-500 ml-1">*</span>
          </label>
          <select
            {...register("staffJobType")}
            className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
          >
            <option value="">{t('job_type_placeholder')}</option>
            <option value="SECURITY">{t('job_security')}</option>
            <option value="CLEANING">{t('job_cleaning')}</option>
            <option value="GARDENING">{t('job_gardening')}</option>
            <option value="MAINTENANCE">{t('job_maintenance')}</option>
            <option value="OTHER">{t('job_other')}</option>
          </select>
          {errors.staffJobType && (
            <p className="text-xs text-danger-600">{errors.staffJobType.message}</p>
          )}
        </div>
      )}

      {!isEditMode && role === "USER" && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 tracking-tight">
            {t('assign_house')}
          </label>
          <SearchableSelect
            options={[
              { value: "", label: t('no_house') },
              ...availableHouses.map((house) => ({
                value: house.id,
                label: `${house.houseNumber} - Block ${house.block} (${house.houseType?.typeName})`,
                searchText: `${house.houseNumber} ${house.block} ${house.houseType?.typeName}`,
              })),
            ]}
            value={houseId || ""}
            onChange={(value) => setValue("houseId", value)}
            placeholder={t('search_house')}
            emptyMessage={t('no_vacant_houses')}
            disabled={isLoadingHouses}
          />
          {isLoadingHouses && (
            <p className="text-xs text-gray-500">{t('loading_houses')}</p>
          )}
          <p className="text-xs text-gray-500">
            {t('assign_house_help')}
          </p>
          {errors.houseId && (
            <p className="text-xs text-danger-600">{errors.houseId.message}</p>
          )}
        </div>
      )}

      {isEditMode && (
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>{t('password_note')}</strong> {t('password_note_message')}
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
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
          fullWidth
        >
          {isEditMode ? t('update_user') : t('create_user')}
        </Button>
      </div>
    </form>
  );
}
