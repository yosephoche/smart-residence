"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import { useAuth } from "@/lib/auth-client";
import PaymentUploadForm from "@/components/forms/PaymentUploadForm";
import { PaymentUploadFormData } from "@/lib/validations/payment.schema";

export const dynamic = 'force-dynamic';

interface House {
  id: string;
  houseNumber: string;
  houseType?: { typeName: string; price: number };
}

interface UploadWindowConfig {
  enabled: boolean;
  startDay: number;
  endDay: number;
}

export default function PaymentUploadPage() {
  const t = useTranslations('payments.user');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [house, setHouse] = useState<House | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [occupiedMonths, setOccupiedMonths] = useState<Array<{ year: number; month: number }>>([]);
  const [uploadWindowConfig, setUploadWindowConfig] = useState<UploadWindowConfig | null>(null);
  const fetchingHouseRef = useRef(false);
  const fetchingOccupiedMonthsRef = useRef(false);

  const isOutsideUploadWindow = useMemo(() => {
    if (!uploadWindowConfig || !uploadWindowConfig.enabled) return false;
    const currentDay = new Date().getDate();
    return currentDay < uploadWindowConfig.startDay || currentDay > uploadWindowConfig.endDay;
  }, [uploadWindowConfig]);

  useEffect(() => {
    // Fetch upload window configuration
    fetch("/api/system-config/upload-window")
      .then((r) => r.json())
      .then((data) => setUploadWindowConfig(data))
      .catch((err) => console.error("Failed to fetch upload window config:", err));
  }, []);

  // Memoize user.id to stabilize dependency
  const userId = useMemo(() => user?.id, [user?.id]);

  useEffect(() => {
    if (!userId || fetchingHouseRef.current) return;

    fetchingHouseRef.current = true;
    fetch(`/api/houses?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.length > 0) setHouse(data[0]);
        setIsLoading(false);
      })
      .catch((err) => console.error("Failed to fetch house:", err))
      .finally(() => { fetchingHouseRef.current = false; });
  }, [userId]);

  // Memoize house.id to stabilize dependency
  const houseId = useMemo(() => house?.id, [house?.id]);

  useEffect(() => {
    if (!houseId || fetchingOccupiedMonthsRef.current) return;

    fetchingOccupiedMonthsRef.current = true;
    fetch(`/api/payments/occupied-months?houseId=${houseId}`)
      .then((r) => r.json())
      .then((data) => setOccupiedMonths(data))
      .catch((err) => console.error("Failed to fetch occupied months:", err))
      .finally(() => { fetchingOccupiedMonthsRef.current = false; });
  }, [houseId]);

  const handleSubmit = async (data: PaymentUploadFormData) => {
    if (!user || !house) {
      setError("Unable to process payment. House information is missing.");
      return;
    }

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

      router.push("/user/payment/success");
    } catch (err: any) {
      setError(err.message || "Failed to submit payment");
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/user/dashboard");
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!house) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('upload_title')}</h1>
          <p className="text-gray-600 mt-1">{t('upload_subtitle')}</p>
        </div>
        <Alert
          variant="warning"
          title={t('no_house_assigned')}
          message={t('no_house_message')}
        />
        <button onClick={() => router.push("/user/dashboard")} className="text-primary-600 hover:text-primary-700 font-medium">
          ← {t('back_to_dashboard')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.push("/user/dashboard")} className="text-gray-600 hover:text-gray-900 font-medium mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('back_to_dashboard')}
        </button>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{t('upload_title')}</h1>
        <p className="text-gray-600 mt-1">{t('upload_subtitle_full')}</p>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError("")} />}

      {isOutsideUploadWindow && uploadWindowConfig && (
        <Alert
          variant="warning"
          title={t('outside_upload_period')}
          message={t('outside_upload_message', { startDay: uploadWindowConfig.startDay, endDay: uploadWindowConfig.endDay })}
        />
      )}

      <Card>
        <PaymentUploadForm
          monthlyRate={house.houseType ? Number(house.houseType.price) : 0}
          houseNumber={house.houseNumber}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
          occupiedMonths={occupiedMonths}
          isOutsideUploadWindow={isOutsideUploadWindow}
        />
      </Card>

      <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-primary-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {t('need_help')}
        </h3>
        <ul className="text-sm text-primary-800 space-y-1 ml-7">
          <li>• {t('help_1')}</li>
          <li>• {t('help_2')}</li>
          <li>• {t('help_3')}</li>
          <li>• {t('help_4')}</li>
          <li>• {t('help_5')}</li>
        </ul>
      </div>
    </div>
  );
}
