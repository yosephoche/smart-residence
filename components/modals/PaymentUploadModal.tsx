"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import PaymentUploadForm from "@/components/forms/PaymentUploadForm";
import { PaymentUploadFormData } from "@/lib/validations/payment.schema";

interface PaymentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  house: {
    id: string;
    houseNumber: string;
    houseType: { price: number };
  };
  onSuccess?: () => void;
}

interface UploadWindowConfig {
  enabled: boolean;
  startDay: number;
  endDay: number;
}

export default function PaymentUploadModal({
  isOpen,
  onClose,
  house,
  onSuccess,
}: PaymentUploadModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [occupiedMonths, setOccupiedMonths] = useState<Array<{ year: number; month: number }>>([]);
  const [uploadWindowConfig, setUploadWindowConfig] = useState<UploadWindowConfig | null>(null);

  const isOutsideUploadWindow = useMemo(() => {
    if (!uploadWindowConfig || !uploadWindowConfig.enabled) return false;
    const currentDay = new Date().getDate();
    return currentDay < uploadWindowConfig.startDay || currentDay > uploadWindowConfig.endDay;
  }, [uploadWindowConfig]);

  // Fetch required data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setError("");

    Promise.all([
      fetch(`/api/payments/occupied-months?houseId=${house.id}`).then((r) => r.json()),
      fetch("/api/system-config/upload-window").then((r) => r.json()),
    ])
      .then(([monthsData, configData]) => {
        setOccupiedMonths(monthsData);
        setUploadWindowConfig(configData);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch modal data:", err);
        setError("Failed to load payment form data. Please try again.");
        setIsLoading(false);
      });
  }, [isOpen, house.id]);

  const handleSubmit = async (data: PaymentUploadFormData) => {
    setError("");
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("amountMonths", String(data.amountMonths));
    formData.append("houseId", house.id);
    formData.append("proofImage", data.proofImage);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || "Failed to submit payment");
        setIsSubmitting(false);
        return;
      }

      // Success: close modal and trigger refresh
      onClose();
      if (onSuccess) {
        onSuccess();
      }

      // Optional: Navigate to success page or show success message
      router.push("/user/payment/success");
    } catch (err: any) {
      setError(err.message || "Failed to submit payment");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Payment Proof"
      size="lg"
      closeOnBackdrop={!isSubmitting}
    >
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-12" />
          <Skeleton className="h-32" />
          <Skeleton className="h-24" />
        </div>
      ) : error ? (
        <div className="space-y-4">
          <Alert
            variant="error"
            message={error}
            onClose={() => setError("")}
          />
          <button
            onClick={() => {
              setError("");
              setIsLoading(true);
              // Retry data fetch
              Promise.all([
                fetch(`/api/payments/occupied-months?houseId=${house.id}`).then((r) => r.json()),
                fetch("/api/system-config/upload-window").then((r) => r.json()),
              ])
                .then(([monthsData, configData]) => {
                  setOccupiedMonths(monthsData);
                  setUploadWindowConfig(configData);
                  setIsLoading(false);
                })
                .catch((err) => {
                  console.error("Failed to fetch modal data:", err);
                  setError("Failed to load payment form data. Please try again.");
                  setIsLoading(false);
                });
            }}
            className="w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {error && (
            <Alert
              variant="error"
              message={error}
              onClose={() => setError("")}
            />
          )}

          {isOutsideUploadWindow && uploadWindowConfig && (
            <Alert
              variant="warning"
              title="Luar Periode Upload"
              message={`Pengajuan pembayaran hanya diizinkan pada tanggal ${uploadWindowConfig.startDay} hingga ${uploadWindowConfig.endDay} setiap bulan. Silahkan coba lagi di bulan berikutnya.`}
            />
          )}

          <PaymentUploadForm
            monthlyRate={Number(house.houseType.price)}
            houseNumber={house.houseNumber}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            occupiedMonths={occupiedMonths}
            isOutsideUploadWindow={isOutsideUploadWindow}
          />
        </div>
      )}
    </Modal>
  );
}
