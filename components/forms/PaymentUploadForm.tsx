"use client";

import { useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentUploadSchema, PaymentUploadFormData } from "@/lib/validations/payment.schema";
import Button from "@/components/ui/Button";
import FileUpload from "@/components/ui/FileUpload";
import { formatCurrency } from "@/lib/utils";
import { calculateTotalPayment, getMonthOptions, computeNextStartMonth, computeCoveredMonths, formatPaymentMonth } from "@/lib/calculations";
import { useTranslations } from "next-intl";

interface PaymentUploadFormProps {
  monthlyRate: number;
  houseNumber: string;
  onSubmit: (data: PaymentUploadFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  occupiedMonths: Array<{ year: number; month: number }>;
  isOutsideUploadWindow: boolean;
}

export default function PaymentUploadForm({
  monthlyRate,
  houseNumber,
  onSubmit,
  onCancel,
  isSubmitting = false,
  occupiedMonths,
  isOutsideUploadWindow,
}: PaymentUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const t = useTranslations('payments.form');
  const tCommon = useTranslations('common');

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<PaymentUploadFormData>({
    resolver: zodResolver(paymentUploadSchema),
    defaultValues: {
      amountMonths: 1,
    },
  });

  const monthOptions = getMonthOptions();
  const selectedMonths = watch("amountMonths");
  const totalAmount = selectedMonths ? calculateTotalPayment(monthlyRate, selectedMonths) : 0;

  const nextStartMonth = useMemo(() => computeNextStartMonth(occupiedMonths), [occupiedMonths]);

  const previewMonths = useMemo(
    () => computeCoveredMonths(nextStartMonth, selectedMonths),
    [nextStartMonth, selectedMonths]
  );

  const overlappingMonths = useMemo(() => {
    return previewMonths.filter((pm) =>
      occupiedMonths.some((om) => om.year === pm.year && om.month === pm.month)
    );
  }, [previewMonths, occupiedMonths]);

  const hasOverlap = overlappingMonths.length > 0;
  const isSubmitDisabled = isSubmitting || hasOverlap || isOutsideUploadWindow;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* House & Rate Info */}
      <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-primary-900">{t('payment_for')}</p>
            <p className="text-lg font-bold text-primary-900">{houseNumber}</p>
          </div>
        </div>
        <div className="bg-primary-100 rounded-lg p-3">
          <p className="text-xs font-medium text-primary-800 mb-1">{t('monthly_rate')}</p>
          <p className="text-2xl font-bold text-primary-900">{formatCurrency(monthlyRate)}</p>
        </div>
      </div>

      {/* Month Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700 tracking-tight">
          {t('number_of_months')} <span className="text-danger-500 ml-1">*</span>
        </label>
        <Controller
          name="amountMonths"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              onChange={(e) => field.onChange(parseInt(e.target.value))}
              className="w-full px-4 py-3 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-primary-500 focus:ring-primary-100"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        />
        {errors.amountMonths && (
          <p className="text-xs text-danger-600">{errors.amountMonths.message}</p>
        )}
        <p className="text-xs text-gray-500">
          {t('number_of_months_help')}
        </p>
      </div>

      {/* Total Amount Display */}
      <div className="bg-success-50 border-2 border-success-200 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-success-700 mb-1">{t('total_amount')}</p>
            <p className="text-xs text-success-600">
              {formatCurrency(monthlyRate)} × {selectedMonths} {t('months_label')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-success-900">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* Covered Months Preview */}
      <div className="border-2 border-gray-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-gray-800 mb-3">{t('months_covered')}</p>
        <div className="flex flex-wrap gap-2">
          {previewMonths.map((pm) => {
            const isOccupied = occupiedMonths.some(
              (om) => om.year === pm.year && om.month === pm.month
            );
            return (
              <span
                key={`${pm.year}-${pm.month}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                  isOccupied
                    ? "bg-danger-100 text-danger-800 border border-danger-300"
                    : "bg-primary-100 text-primary-800 border border-primary-300"
                }`}
              >
                {formatPaymentMonth(pm)}
                {isOccupied && (
                  <span className="text-xs font-semibold bg-danger-200 text-danger-800 px-1.5 py-0.5 rounded">
                    {t('already_filled')}
                  </span>
                )}
              </span>
            );
          })}
        </div>
        {hasOverlap && (
          <p className="text-xs text-danger-700 mt-3 font-medium">
            {t('conflict_error')}
          </p>
        )}
      </div>

      {/* File Upload */}
      <Controller
        name="proofImage"
        control={control}
        render={({ field: { onChange, value, ...field } }) => (
          <FileUpload
            label={t('upload_proof')}
            error={errors.proofImage?.message as string}
            helperText={t('upload_proof_help')}
            onChange={(file) => {
              setSelectedFile(file);
              onChange(file);
            }}
            value={selectedFile}
            required
            {...field}
          />
        )}
      />

      {/* Payment Instructions */}
      <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          {t('payment_instructions')}
        </h3>
        <ol className="text-sm text-gray-700 space-y-2 ml-7 list-decimal">
          <li>{t('instruction_1')}</li>
          <li>{t('instruction_2')}</li>
          <li>{t('instruction_3')}</li>
          <li>{t('instruction_4')}</li>
          <li>{t('instruction_5')}</li>
        </ol>
      </div>

      {/* Action Buttons */}
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
          disabled={isSubmitDisabled}
          fullWidth
        >
          {t('submit_payment')}
        </Button>
      </div>
    </form>
  );
}
