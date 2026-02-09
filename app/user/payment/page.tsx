"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Loading";
import { useAuth } from "@/lib/auth-client";
import PaymentUploadForm from "@/components/forms/PaymentUploadForm";
import { PaymentUploadFormData } from "@/lib/validations/payment.schema";
import { UPLOAD_WINDOW_LAST_DAY } from "@/lib/constants";

interface House {
  id: string;
  houseNumber: string;
  houseType?: { typeName: string; price: number };
}

export default function PaymentUploadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [house, setHouse] = useState<House | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [occupiedMonths, setOccupiedMonths] = useState<Array<{ year: number; month: number }>>([]);

  const isOutsideUploadWindow = new Date().getDate() > UPLOAD_WINDOW_LAST_DAY;

  useEffect(() => {
    if (!user) return;
    fetch(`/api/houses?userId=${user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.length > 0) setHouse(data[0]);
        setIsLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!house) return;
    fetch(`/api/payments/occupied-months?houseId=${house.id}`)
      .then((r) => r.json())
      .then((data) => setOccupiedMonths(data));
  }, [house]);

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
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Upload Payment Proof</h1>
          <p className="text-gray-600 mt-1">Submit your IPL payment receipt</p>
        </div>
        <Alert
          variant="warning"
          title="No House Assigned"
          message="You don't have a house assigned to your account yet. Please contact the administrator to assign a house before making payments."
        />
        <button onClick={() => router.push("/user/dashboard")} className="text-primary-600 hover:text-primary-700 font-medium">
          ← Back to Dashboard
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
          Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Upload Payment Proof</h1>
        <p className="text-gray-600 mt-1">Submit your IPL payment receipt for approval</p>
      </div>

      {error && <Alert variant="error" message={error} onClose={() => setError("")} />}

      {isOutsideUploadWindow && (
        <Alert
          variant="warning"
          title="Luar Periode Upload"
          message="Pengajuan pembayaran hanya diizinkan pada tanggal 1 hingga 10 setiap bulan. Silahkan coba lagi di bulan berikutnya."
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
          Need Help?
        </h3>
        <ul className="text-sm text-primary-800 space-y-1 ml-7">
          <li>• Make sure your payment proof image is clear and readable</li>
          <li>• The amount on the receipt should match the total shown above</li>
          <li>• Include the transaction date and reference number if available</li>
          <li>• Payment approval typically takes 1-2 business days</li>
          <li>• You can track your payment status in Payment History</li>
        </ul>
      </div>
    </div>
  );
}
