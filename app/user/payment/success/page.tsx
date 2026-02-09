"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

export default function PaymentSuccessPage() {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <div className="text-center py-12 px-6">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-300">
            <svg
              className="w-10 h-10 text-success-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Payment Submitted Successfully!
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Your payment proof has been submitted and is now pending admin approval.
            You&apos;ll be notified once your payment is reviewed.
          </p>

          {/* What's Next */}
          <div className="bg-primary-50 border-2 border-primary-200 rounded-xl p-6 mb-8 text-left">
            <h3 className="text-sm font-semibold text-primary-900 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              What Happens Next?
            </h3>
            <ol className="text-sm text-primary-800 space-y-2 ml-7 list-decimal">
              <li>Admin will review your payment proof within 1-2 business days</li>
              <li>You&apos;ll receive a notification about the approval status</li>
              <li>Once approved, the payment will be reflected in your dashboard</li>
              <li>If rejected, you&apos;ll see the reason and can resubmit</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/user/history">
              <Button variant="primary" size="lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                View Payment History
              </Button>
            </Link>

            <Link href="/user/dashboard">
              <Button variant="ghost" size="lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
