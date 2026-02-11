"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Key, Loader2, Eye, EyeOff } from "lucide-react";

const defaultPasswordSchema = z.object({
  defaultPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password too long"),
});

type DefaultPasswordFormData = z.infer<typeof defaultPasswordSchema>;

interface DefaultPasswordConfigFormProps {
  initialConfig: DefaultPasswordFormData;
  onSaveSuccess: (config: DefaultPasswordFormData) => void;
  onSaveError: (errorMessage: string) => void;
}

export function DefaultPasswordConfigForm({
  initialConfig,
  onSaveSuccess,
  onSaveError,
}: DefaultPasswordConfigFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<DefaultPasswordFormData>({
    resolver: zodResolver(defaultPasswordSchema),
    defaultValues: initialConfig,
  });

  const defaultPassword = watch("defaultPassword");

  const onSubmit = async (data: DefaultPasswordFormData) => {
    setIsSaving(true);

    try {
      const response = await fetch("/api/system-config/default-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal menyimpan konfigurasi");
      }

      const result = await response.json();
      onSaveSuccess(data);
    } catch (error) {
      console.error("Error saving default password config:", error);
      onSaveError(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan konfigurasi"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Current Default Password Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Key className="w-5 h-5 text-gray-500" />
          <span className="font-medium">Password Default Saat Ini:</span>
          <code className="px-2 py-1 bg-white border border-gray-300 rounded font-mono text-sm">
            {initialConfig.defaultPassword}
          </code>
        </div>
      </div>

      {/* Password Input */}
      <div>
        <label
          htmlFor="defaultPassword"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Password Default Baru
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            id="defaultPassword"
            {...register("defaultPassword")}
            className={`w-full px-4 py-2 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.defaultPassword ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter new default password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
        {errors.defaultPassword && (
          <p className="text-sm text-red-600 mt-1">
            {errors.defaultPassword.message}
          </p>
        )}

        {/* Character count */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500">
            Password akan digunakan untuk semua user baru
          </p>
          <p
            className={`text-xs ${
              defaultPassword.length >= 6 ? "text-green-600" : "text-gray-500"
            }`}
          >
            {defaultPassword.length} / 100 karakter
          </p>
        </div>
      </div>

      {/* Preview Section */}
      {defaultPassword && defaultPassword.length >= 6 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2 text-green-700">
            <Key className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Password valid</p>
              <p className="text-sm">
                Setiap user baru akan dibuat dengan password ini
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSaving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </button>
      </div>
    </form>
  );
}
