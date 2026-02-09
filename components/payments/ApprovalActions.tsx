"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";

interface ApprovalActionsProps {
  paymentId: string;
  onApprove: () => void;
  onReject: (reason: string) => void;
  isProcessing?: boolean;
}

export default function ApprovalActions({
  paymentId,
  onApprove,
  onReject,
  isProcessing = false,
}: ApprovalActionsProps) {
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState("");

  const handleRejectSubmit = () => {
    if (!rejectionReason.trim()) {
      setError("Please provide a reason for rejection");
      return;
    }

    onReject(rejectionReason);
    setIsRejectModalOpen(false);
    setRejectionReason("");
    setError("");
  };

  return (
    <>
      <div className="flex gap-3">
        <Button
          variant="danger"
          size="lg"
          onClick={() => setIsRejectModalOpen(true)}
          disabled={isProcessing}
          fullWidth
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Reject
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={onApprove}
          isLoading={isProcessing}
          fullWidth
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Approve Payment
        </Button>
      </div>

      {/* Rejection Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRejectionReason("");
          setError("");
        }}
        title="Reject Payment"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Please provide a reason for rejecting this payment. The resident will see this message.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Rejection Reason <span className="text-danger-500">*</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                setError("");
              }}
              rows={4}
              placeholder="e.g., Payment proof is unclear, amount doesn't match, etc."
              className="w-full px-4 py-2.5 text-sm text-gray-900 bg-white border-2 border-gray-300 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:border-danger-500 focus:ring-danger-100 resize-none"
            />
            {error && <p className="text-xs text-danger-600">{error}</p>}
          </div>

          <div className="bg-warning-50 border-2 border-warning-200 rounded-lg p-4">
            <p className="text-sm text-warning-800">
              <strong>Note:</strong> Make sure to provide a clear and helpful reason
              so the resident can resubmit with the correct information.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectionReason("");
                setError("");
              }}
              fullWidth
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="lg"
              onClick={handleRejectSubmit}
              fullWidth
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
