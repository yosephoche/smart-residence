"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

interface ScheduleChipData {
  id: string;
  staff: { name: string };
  shiftTemplate: { startTime: string };
}

interface ScheduleChipProps {
  schedule: ScheduleChipData;
  onDeleteClick: (id: string) => void;
}

function getShiftColor(startTime: string): "blue" | "amber" {
  const hour = parseInt(startTime.split(":")[0], 10);
  return hour < 12 ? "blue" : "amber";
}

export default function ScheduleChip({ schedule, onDeleteClick }: ScheduleChipProps) {
  const [showActions, setShowActions] = useState(false);
  const color = getShiftColor(schedule.shiftTemplate.startTime);

  const colorClass =
    color === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  const dotClass = color === "blue" ? "bg-blue-500" : "bg-amber-500";

  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer select-none border ${colorClass}`}
      onClick={(e) => {
        e.stopPropagation();
        setShowActions((prev) => !prev);
      }}
    >
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
      <span className={`truncate ${showActions ? "max-w-[52px]" : "max-w-[72px]"}`}>
        {schedule.staff.name}
      </span>
      {showActions && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteClick(schedule.id);
            setShowActions(false);
          }}
          className="flex-shrink-0 text-red-500 hover:text-red-700 ml-auto"
        >
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      )}
    </div>
  );
}
