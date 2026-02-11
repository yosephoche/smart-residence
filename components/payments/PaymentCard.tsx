"use client";

import { useState } from "react";
import Image from "next/image";
import { Payment } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatPaymentMonth } from "@/lib/calculations";
import PaymentStatusBadge from "./PaymentStatusBadge";
import Modal from "@/components/ui/Modal";

interface PaymentCardProps {
  payment: Payment;
  houseNumber?: string;
}

export default function PaymentCard({ payment, houseNumber }: PaymentCardProps) {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  return (
    <>
      <div className="bg-white rounded-xl border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {payment.amountMonths} Month{payment.amountMonths !== 1 ? 's' : ''} Payment
              </h3>
              <PaymentStatusBadge status={payment.status} size="sm" showDot />
            </div>
            {houseNumber && (
              <p className="text-sm text-gray-500">House {houseNumber}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(payment.totalAmount)}
            </p>
            <p className="text-xs text-gray-500">
              {formatCurrency(payment.totalAmount / payment.amountMonths)}/month
            </p>
          </div>
        </div>

        {/* Payment Details */}
        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600 mb-1">Submitted On</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(payment.createdAt)}
            </p>
          </div>
          {payment.status === "APPROVED" && payment.approvedAt && (
            <div>
              <p className="text-xs text-gray-600 mb-1">Approved On</p>
              <p className="text-sm font-medium text-success-700">
                {formatDate(payment.approvedAt)}
              </p>
            </div>
          )}
          {payment.status === "REJECTED" && payment.rejectionNote && (
            <div className="col-span-2">
              <p className="text-xs text-gray-600 mb-1">Rejection Reason</p>
              <p className="text-sm font-medium text-danger-700">
                {payment.rejectionNote}
              </p>
            </div>
          )}
          {payment.paymentMonths && payment.paymentMonths.length > 0 && (
            <div className="col-span-2">
              <p className="text-xs text-gray-600 mb-1.5">Bulan yang Dicakup</p>
              <div className="flex flex-wrap gap-1.5">
                {payment.paymentMonths.map((pm) => (
                  <span
                    key={`${pm.year}-${pm.month}`}
                    className="inline-block px-2 py-0.5 bg-primary-100 text-primary-800 text-xs font-medium rounded-full border border-primary-200"
                  >
                    {formatPaymentMonth(pm)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment Proof Thumbnail */}
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Payment Proof</p>
          <button
            onClick={() => setIsImageModalOpen(true)}
            className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary-400 transition-colors group"
          >
            <Image
              src={payment.proofImagePath}
              alt="Payment proof thumbnail"
              fill
              className="object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
              }}
            />
            <div className="hidden absolute inset-0 flex items-center justify-center bg-gray-200">
              <div className="text-center">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-xs text-gray-500 font-medium">No image available</p>
              </div>
            </div>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
            </div>
          </button>
          <p className="text-xs text-gray-500 mt-1 text-center">
            {payment.proofImagePath.split('/').pop()}
          </p>
        </div>
      </div>

      {/* Image Modal */}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title="Payment Proof"
        size="lg"
      >
        <div className="relative aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
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
      </Modal>
    </>
  );
}
