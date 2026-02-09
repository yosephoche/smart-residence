"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { userFormSchema, UserFormData } from "@/lib/validations/user.schema";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
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
  const isEditMode = !!user;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: user
      ? {
          name: user.name,
          email: user.email,
          role: user.role,
        }
      : {
          role: "USER",
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Input
        label="Full Name"
        placeholder="Enter full name"
        error={errors.name?.message}
        {...register("name")}
        fullWidth
        required
      />

      <Input
        label="Email Address"
        type="email"
        placeholder="user@example.com"
        error={errors.email?.message}
        helperText={isEditMode ? "Email cannot be changed after creation" : undefined}
        {...register("email")}
        fullWidth
        required
        disabled={isEditMode}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          Role <span className="text-danger-500 ml-1">*</span>
        </label>
        <select
          {...register("role")}
          className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
        >
          <option value="USER">User (Resident)</option>
          <option value="ADMIN">Admin</option>
        </select>
        {errors.role && (
          <p className="text-xs text-danger-600">{errors.role.message}</p>
        )}
      </div>

      {!isEditMode && (
        <Input
          label="Password"
          type="password"
          placeholder="Enter password (default: IPL2026)"
          error={errors.password?.message}
          helperText="Leave empty to use default password: IPL2026"
          {...register("password")}
          fullWidth
        />
      )}

      {isEditMode && (
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>Note:</strong> Password cannot be changed from this form. Users
            must change their own password after logging in.
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
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isSubmitting}
          fullWidth
        >
          {isEditMode ? "Update User" : "Create User"}
        </Button>
      </div>
    </form>
  );
}
