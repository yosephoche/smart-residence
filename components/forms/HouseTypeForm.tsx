"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { houseTypeFormSchema, HouseTypeFormData } from "@/lib/validations/houseType.schema";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { HouseType } from "@/types";
import { formatCurrency } from "@/lib/utils";

interface HouseTypeFormProps {
  houseType?: HouseType;
  onSubmit: (data: HouseTypeFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function HouseTypeForm({
  houseType,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: HouseTypeFormProps) {
  const isEditMode = !!houseType;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<HouseTypeFormData>({
    resolver: zodResolver(houseTypeFormSchema),
    defaultValues: houseType
      ? {
          typeName: houseType.typeName,
          price: houseType.price,
          description: houseType.description || "",
        }
      : undefined,
  });

  const priceValue = watch("price");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Type Name"
        placeholder="e.g., Tipe 36, Tipe 45"
        error={errors.typeName?.message}
        helperText="Name of the house type (e.g., Tipe 36)"
        {...register("typeName")}
        fullWidth
        required
      />

      <div>
        <Controller
          name="price"
          control={control}
          render={({ field }) => (
            <Input
              label="Monthly IPL Price"
              type="number"
              placeholder="150000"
              error={errors.price?.message}
              helperText="Price in Rupiah per month"
              {...field}
              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
              fullWidth
              required
              leftIcon={
                <span className="text-gray-500 font-medium">Rp</span>
              }
            />
          )}
        />

        {priceValue > 0 && (
          <div className="mt-2 p-3 bg-primary-50 rounded-lg border-2 border-primary-200">
            <p className="text-xs font-medium text-primary-900 mb-1">
              Display Format
            </p>
            <p className="text-xl font-bold text-primary-900">
              {formatCurrency(priceValue)}
            </p>
            <p className="text-xs text-primary-700 mt-1">per month</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          Description (Optional)
        </label>
        <textarea
          {...register("description")}
          rows={3}
          placeholder="Brief description of this house type..."
          className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100 resize-none"
        />
        {errors.description && (
          <p className="text-xs text-danger-600">{errors.description.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={onCancel}
          disabled={isSubmitting}
          fullWidth
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          fullWidth
        >
          {isEditMode ? "Update Type" : "Create Type"}
        </Button>
      </div>
    </form>
  );
}
