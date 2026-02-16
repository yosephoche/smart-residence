"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { houseFormSchema, HouseFormData } from "@/lib/validations/house.schema";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { House, HouseType, User } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface HouseFormProps {
  house?: House;
  houseTypes: HouseType[];
  users: User[];
  onSubmit: (data: HouseFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function HouseForm({
  house,
  houseTypes,
  users,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: HouseFormProps) {
  const t = useTranslations('houses.form');
  const tCommon = useTranslations('common');
  const isEditMode = !!house;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<HouseFormData>({
    resolver: zodResolver(houseFormSchema),
    defaultValues: house
      ? {
          houseNumber: house.houseNumber,
          block: house.block,
          houseTypeId: house.houseTypeId,
          userId: house.userId || "",
          isRented: house.isRented || false,
          renterName: house.renterName || "",
        }
      : undefined,
  });

  const selectedHouseTypeId = watch("houseTypeId");
  const selectedHouseType = houseTypes.find((t) => t.id === selectedHouseTypeId);
  const isRented = watch("isRented");

  // Clear renterName when unchecked
  useEffect(() => {
    if (!isRented) {
      setValue("renterName", "");
    }
  }, [isRented, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label={t('block')}
          placeholder={t('block_placeholder')}
          error={errors.block?.message}
          helperText={t('block_help')}
          {...register("block")}
          fullWidth
          required
        />

        <Input
          label={t('house_number')}
          placeholder={t('house_number_placeholder')}
          error={errors.houseNumber?.message}
          helperText={t('house_number_help')}
          {...register("houseNumber")}
          fullWidth
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('house_type')} <span className="text-danger-500 ml-1">*</span>
        </label>
        <select
          {...register("houseTypeId")}
          className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
        >
          <option value="">{t('select_house_type')}</option>
          {houseTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.typeName} - {formatCurrency(type.price)}{t('per_month')}
            </option>
          ))}
        </select>
        {errors.houseTypeId && (
          <p className="text-xs text-danger-600">{errors.houseTypeId.message}</p>
        )}

        {selectedHouseType && (
          <div className="mt-2 p-3 bg-primary-50 rounded-lg border-2 border-primary-200">
            <p className="text-xs font-medium text-primary-900 mb-1">
              {t('monthly_ipl_rate')}
            </p>
            <p className="text-2xl font-bold text-primary-900">
              {formatCurrency(selectedHouseType.price)}
            </p>
            {selectedHouseType.description && (
              <p className="text-xs text-primary-700 mt-1">
                {selectedHouseType.description}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('assign_resident')}
        </label>
        <select
          {...register("userId")}
          className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
        >
          <option value="">{t('unassigned')}</option>
          {users
            .filter((u) => u.role === "USER")
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
        </select>
        <p className="text-xs text-gray-500">
          {t('unassigned_help')}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 tracking-tight cursor-pointer">
          <input
            type="checkbox"
            {...register("isRented")}
            className="w-4 h-4 text-primary-600 bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
          />
          <span>{t('is_rented')}</span>
        </label>
        <p className="text-xs text-gray-500">
          {t('is_rented_help')}
        </p>
      </div>

      {isRented && (
        <div className="border-2 border-primary-200 bg-primary-50 rounded-lg p-4">
          <Input
            label={t('renter_name')}
            placeholder={t('renter_name_placeholder')}
            error={errors.renterName?.message}
            helperText={t('renter_name_help')}
            {...register("renterName")}
            fullWidth
            required
          />
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
          {isEditMode ? t('update_house') : t('create_house')}
        </Button>
      </div>
    </form>
  );
}
