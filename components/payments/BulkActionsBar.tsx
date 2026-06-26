"use client";

import Button from "@/components/ui/Button";

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onApprove: () => void;
  labels: {
    selectedCount: string;
    readyApproval: string;
    clearSelection: string;
    approveSelected: string;
  };
}

export default function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onApprove,
  labels,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-slate-900">{labels.selectedCount}</p>
          <p className="text-sm text-slate-600">{labels.readyApproval}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onClearSelection}>{labels.clearSelection}</Button>
        <Button variant="primary" onClick={onApprove}>{labels.approveSelected}</Button>
      </div>
    </div>
  );
}
