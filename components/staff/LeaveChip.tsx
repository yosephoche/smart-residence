"use client";

export interface LeaveChipData {
  staffName: string;
}

interface LeaveChipProps {
  leave: LeaveChipData;
}

export default function LeaveChip({ leave }: LeaveChipProps) {
  return (
    <div
      className="flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium bg-rose-50 text-rose-700 border border-rose-200 leading-none"
      title={`Cuti: ${leave.staffName}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
      <span className="truncate max-w-[72px]">Cuti: {leave.staffName}</span>
    </div>
  );
}
