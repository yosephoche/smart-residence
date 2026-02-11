"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import Loading from "@/components/ui/Loading";
import PaymentStatusBadge from "@/components/payments/PaymentStatusBadge";
import ApprovalActions from "@/components/payments/ApprovalActions";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { formatPaymentMonth } from "@/lib/calculations";

interface Payment {
  id: string;
  userId: string;
  houseId: string;
  amountMonths: number;
  totalAmount: number;
  proofImagePath: string;
  status: string;
  rejectionNote?: string;
  approvedAt?: string;
  createdAt: string;
  user?: { id: string; name: string; email: string; createdAt: string };
  house?: {
    id: string;
    houseNumber: string;
    block: string;
    houseType?: { typeName: string; price: number };
  };
  paymentMonths?: Array<{ year: number; month: number }>;
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const paymentId = params.id as string;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetch(`/api/payments/${paymentId}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          setIsLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setPayment(data);
        setIsLoading(false);
      });
  }, [paymentId]);

  const handleApprove = async () => {
    if (!payment) return;
    setIsProcessing(true);
    const res = await fetch(`/api/payments/${payment.id}/approve`, {
      method: "POST",
    });
    if (res.ok) {
      const updated = await res.json();
      setPayment((prev) => prev ? { ...prev, status: updated.status, approvedAt: updated.approvedAt } : prev);
      setSuccessMessage("Payment has been approved successfully");
      setTimeout(() => router.push("/admin/payments"), 2000);
    }
    setIsProcessing(false);
  };

  const handleReject = async (reason: string) => {
    if (!payment) return;
    setIsProcessing(true);
    const res = await fetch(`/api/payments/${payment.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rejectionNote: reason }),
    });
    if (res.ok) {
      const updated = await res.json();
      setPayment((prev) => prev ? { ...prev, status: updated.status, rejectionNote: updated.rejectionNote } : prev);
      setSuccessMessage("Payment has been rejected");
      setTimeout(() => router.push("/admin/payments"), 2000);
    }
    setIsProcessing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loading size="lg" text="Loading payment details..." />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Alert variant="error" title="Payment Not Found" message="The payment you're looking for doesn't exist." />
        <button onClick={() => router.push("/admin/payments")} className="text-primary-600 hover:text-primary-700 font-medium">
          ← Back to Payments
        </button>
      </div>
    );
  }

  const isPending = payment?.status === "PENDING";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <button onClick={() => router.push("/admin/payments")} className="text-gray-600 hover:text-gray-900 font-medium mb-4 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Payments
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Details</h1>
          {payment && <PaymentStatusBadge status={payment.status as any} size="lg" showDot />}
        </div>
      </div>

      {successMessage && <Alert variant="success" message={successMessage} autoClose />}

      {payment && (
        <>
          <Card>
            <CardHeader>Payment Information</CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Payment Amount</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(Number(payment.totalAmount))}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {payment.amountMonths} month{payment.amountMonths !== 1 ? "s" : ""} ×{" "}
                    {formatCurrency(Number(payment.totalAmount) / payment.amountMonths)}/month
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Submitted On</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDateTime(payment.createdAt)}</p>
                </div>
                {payment.status === "APPROVED" && payment.approvedAt && (
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Approved On</p>
                    <p className="text-lg font-semibold text-success-700">{formatDateTime(payment.approvedAt)}</p>
                  </div>
                )}
                {payment.paymentMonths && payment.paymentMonths.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-600 mb-2">Bulan yang Dicakup</p>
                    <div className="flex flex-wrap gap-2">
                      {payment.paymentMonths.map((pm) => (
                        <span
                          key={`${pm.year}-${pm.month}`}
                          className="inline-block px-3 py-1 bg-primary-100 text-primary-800 text-sm font-medium rounded-full border border-primary-200"
                        >
                          {formatPaymentMonth(pm)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>Resident Information</CardHeader>
              <CardContent>
                {payment.user ? (
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 font-bold text-xl">{payment.user.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-lg">{payment.user.name}</p>
                      <p className="text-sm text-gray-600">{payment.user.email}</p>
                      <p className="text-xs text-gray-500 mt-2">Member since {formatDate(payment.user.createdAt)}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">User information not available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>House Information</CardHeader>
              <CardContent>
                {payment.house ? (
                  <div>
                    <p className="text-2xl font-bold text-gray-900 mb-2">{payment.house.houseNumber}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Block:</span>
                        <span className="font-medium text-gray-900">{payment.house.block}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium text-gray-900">{payment.house.houseType?.typeName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Monthly Rate:</span>
                        <span className="font-medium text-gray-900">
                          {payment.house.houseType && formatCurrency(Number(payment.house.houseType.price))}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">House information not available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payment Proof */}
          <Card>
            <CardHeader>Payment Proof</CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gray-100 rounded-lg border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                <Image
                  src={payment.proofImagePath}
                  alt="Payment proof"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="hidden text-center p-8">
                  <svg className="w-24 h-24 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">Payment Proof Image</p>
                  <p className="text-sm text-gray-500">{payment.proofImagePath}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {payment.status === "REJECTED" && payment.rejectionNote && (
            <Alert variant="error" title="Rejection Reason" message={payment.rejectionNote} />
          )}

          {isPending && (
            <Card>
              <CardHeader>Review Actions</CardHeader>
              <CardContent>
                <ApprovalActions
                  paymentId={payment.id}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isProcessing={isProcessing}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
