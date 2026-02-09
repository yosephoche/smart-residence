"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const isEditMode = !!house;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<HouseFormData>({
    resolver: zodResolver(houseFormSchema),
    defaultValues: house
      ? {
          houseNumber: house.houseNumber,
          block: house.block,
          houseTypeId: house.houseTypeId,
          userId: house.userId || "",
        }
      : undefined,
  });

  const selectedHouseTypeId = watch("houseTypeId");
  const selectedHouseType = houseTypes.find((t) => t.id === selectedHouseTypeId);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Input
          label="Block"
          placeholder="e.g., A, Block 1, West"
          error={errors.block?.message}
          helperText="Enter the block name or identifier"
          {...register("block")}
          fullWidth
          required
        />

        <Input
          label="House Number"
          placeholder="e.g., 101, A-01, House 5"
          error={errors.houseNumber?.message}
          helperText="Enter the house number or identifier"
          {...register("houseNumber")}
          fullWidth
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          House Type <span className="text-danger-500 ml-1">*</span>
        </label>
        <select
          {...register("houseTypeId")}
          className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
        >
          <option value="">Select house type</option>
          {houseTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.typeName} - {formatCurrency(type.price)}/month
            </option>
          ))}
        </select>
        {errors.houseTypeId && (
          <p className="text-xs text-danger-600">{errors.houseTypeId.message}</p>
        )}

        {selectedHouseType && (
          <div className="mt-2 p-3 bg-primary-50 rounded-lg border-2 border-primary-200">
            <p className="text-xs font-medium text-primary-900 mb-1">
              Monthly IPL Rate
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
          Assign to Resident (Optional)
        </label>
        <select
          {...register("userId")}
          className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
        >
          <option value="">Unassigned</option>
          {users
            .filter((u) => u.role === "USER")
            .map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
        </select>
        <p className="text-xs text-gray-500">
          Leave unassigned if no resident has moved in yet
        </p>
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
          {isEditMode ? "Update House" : "Create House"}
        </Button>
      </div>
    </form>
  );
}
