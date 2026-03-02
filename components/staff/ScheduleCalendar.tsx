"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import ScheduleChip from "./ScheduleChip";
import LeaveChip, { type LeaveChipData } from "./LeaveChip";

// Minimal type needed by the calendar; compatible with the page's full Schedule type
interface CalendarSchedule {
  id: string;
  staff: { name: string };
  shiftTemplate: { startTime: string };
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCalendarGrid(year: number, month: number) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Mon=0, Tue=1, …, Sun=6
  const startDow = (firstDay.getDay() + 6) % 7;

  const cells: Array<{
    date: Date;
    dateKey: string;
    isCurrentMonth: boolean;
    isToday: boolean;
  }> = [];

  // Previous month overflow
  for (let i = startDow; i > 0; i--) {
    const date = new Date(year, month, 1 - i);
    cells.push({ date, dateKey: toDateKey(date), isCurrentMonth: false, isToday: false });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateKey = toDateKey(date);
    cells.push({ date, dateKey, isCurrentMonth: true, isToday: dateKey === todayKey });
  }

  // Next month fill to complete last row
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const date = new Date(year, month + 1, nextDay++);
    cells.push({ date, dateKey: toDateKey(date), isCurrentMonth: false, isToday: false });
  }
  // Ensure at least 35 cells (5 rows)
  while (cells.length < 35) {
    const date = new Date(year, month + 1, nextDay++);
    cells.push({ date, dateKey: toDateKey(date), isCurrentMonth: false, isToday: false });
  }

  return cells;
}

function CalendarLoadingSkeleton() {
  return (
    <div className="animate-pulse grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="h-20 bg-gray-100 rounded-lg" />
      ))}
    </div>
  );
}

const MAX_CHIPS = 4;
const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface CalendarCellProps {
  date: Date;
  dateKey: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  schedules: CalendarSchedule[];
  leaves: LeaveChipData[];
  onDateClick: (dateKey: string) => void;
  onDeleteClick: (id: string) => void;
}

function CalendarCell({
  date,
  dateKey,
  isCurrentMonth,
  isToday,
  schedules,
  leaves,
  onDateClick,
  onDeleteClick,
}: CalendarCellProps) {
  // Leave chips first, then schedule chips; combined cap at MAX_CHIPS
  const totalCount = leaves.length + schedules.length;
  const visibleLeaves = leaves.slice(0, MAX_CHIPS);
  const remainingSlots = Math.max(0, MAX_CHIPS - visibleLeaves.length);
  const visibleSchedules = schedules.slice(0, remainingSlots);
  const overflow = totalCount - visibleLeaves.length - visibleSchedules.length;

  return (
    <div
      className={[
        "relative min-h-[80px] rounded-lg border p-1 cursor-pointer group transition-colors",
        isCurrentMonth ? "bg-white border-gray-100" : "bg-gray-50/50 border-gray-50",
        isToday
          ? "border-blue-300 ring-1 ring-blue-100"
          : "hover:border-blue-200 hover:bg-blue-50/40",
      ].join(" ")}
      onClick={() => onDateClick(dateKey)}
    >
      {/* Date number */}
      <div
        className={[
          "text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-0.5",
          isToday
            ? "bg-blue-600 text-white"
            : isCurrentMonth
            ? "text-gray-800"
            : "text-gray-300",
        ].join(" ")}
      >
        {date.getDate()}
      </div>

      {/* Hover + icon */}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
        <Plus className="w-3 h-3 text-blue-500" />
      </div>

      {/* Chips: leave first, then schedule */}
      <div className="space-y-0.5">
        {visibleLeaves.map((leave, i) => (
          <LeaveChip key={`leave-${i}`} leave={leave} />
        ))}
        {visibleSchedules.map((schedule) => (
          <ScheduleChip
            key={schedule.id}
            schedule={schedule}
            onDeleteClick={onDeleteClick}
          />
        ))}
        {overflow > 0 && (
          <p className="text-[9px] text-gray-400 pl-0.5 leading-none">+{overflow} more</p>
        )}
      </div>
    </div>
  );
}

export interface ScheduleCalendarProps {
  year: number;
  month: number;
  // Accepts any schedule shape that has id/staff/shiftTemplate fields
  schedulesByDate: Map<string, any[]>;
  leavesByDate?: Map<string, LeaveChipData[]>;
  loading: boolean;
  onMonthChange: (year: number, month: number) => void;
  onDateClick: (dateKey: string) => void;
  onDeleteClick: (scheduleId: string) => void;
}

export default function ScheduleCalendar({
  year,
  month,
  schedulesByDate,
  leavesByDate,
  loading,
  onMonthChange,
  onDateClick,
  onDeleteClick,
}: ScheduleCalendarProps) {
  const t = useTranslations("staff.schedule");
  const cells = buildCalendarGrid(year, month);

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const prevMonth = () =>
    month === 0 ? onMonthChange(year - 1, 11) : onMonthChange(year, month - 1);

  const nextMonth = () =>
    month === 11 ? onMonthChange(year + 1, 0) : onMonthChange(year, month + 1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Month navigation header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="text-sm font-semibold text-gray-900 capitalize">{monthLabel}</h2>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DOW_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-semibold text-gray-400 py-1"
            >
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {loading ? (
          <CalendarLoadingSkeleton />
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell) => (
              <CalendarCell
                key={cell.dateKey}
                {...cell}
                schedules={schedulesByDate.get(cell.dateKey) ?? []}
                leaves={leavesByDate?.get(cell.dateKey) ?? []}
                onDateClick={onDateClick}
                onDeleteClick={onDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Color legend */}
      <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] text-gray-500">{t("calendar_legend_morning")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-[10px] text-gray-500">{t("calendar_legend_afternoon")}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-rose-500" />
          <span className="text-[10px] text-gray-500">{t("calendar_legend_leave")}</span>
        </div>
      </div>
    </div>
  );
}
