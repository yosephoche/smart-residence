"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { JobType } from "@prisma/client";
import Table, { Column, Pagination } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal, { ConfirmModal } from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Plus, Sparkles, Trash2, List, CalendarDays } from "lucide-react";
import { usePagination } from "@/lib/hooks/usePagination";
import ScheduleCalendar, { toDateKey } from "@/components/staff/ScheduleCalendar";

export const dynamic = 'force-dynamic';

interface Schedule {
  id: string;
  date: string;
  notes: string | null;
  staff: {
    id: string;
    name: string;
    staffJobType: JobType;
  };
  shiftTemplate: {
    id: string;
    shiftName: string;
    startTime: string;
    endTime: string;
  };
}

interface ShiftTemplate {
  id: string;
  jobType: JobType;
  shiftName: string;
  startTime: string;
  endTime: string;
}

interface Staff {
  id: string;
  name: string;
  staffJobType: JobType;
}

export default function SchedulePage() {
  const t = useTranslations('staff.schedule');
  const tCommon = useTranslations('common');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // View mode
  const now = new Date();
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [calendarMonth, setCalendarMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(1); // First day of month
    return today.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.toISOString().split("T")[0];
  });

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAutoGenModalOpen, setIsAutoGenModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    staffId: "",
    shiftTemplateId: "",
    date: "",
    endDate: "",
    isBulk: false,
    notes: "",
  });
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // Auto-generate form
  const [autoGenForm, setAutoGenForm] = useState({
    jobType: "SECURITY" as JobType,
    startDate: "",
    endDate: "",
  });
  const [autoGenError, setAutoGenError] = useState("");
  const [generating, setGenerating] = useState(false);

  // Derived: schedules grouped by date key for calendar view
  const schedulesByDate = useMemo(() => {
    const map = new Map<string, Schedule[]>();
    for (const schedule of schedules) {
      const key = toDateKey(new Date(schedule.date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(schedule);
    }
    return map;
  }, [schedules]);

  // Pagination
  const {
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    paginatedData,
    totalPages,
    totalItems,
  } = usePagination(schedules, {
    initialPageSize: 25,
    resetDeps: [startDate, endDate],
  });

  useEffect(() => {
    fetchSchedules();
    fetchStaff();
    fetchShiftTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (startDate) params.append("startDate", new Date(startDate).toISOString());
      if (endDate) params.append("endDate", new Date(endDate).toISOString());

      const res = await fetch(`/api/admin/schedules?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch schedules");

      setSchedules(data.schedules);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const res = await fetch("/api/users?role=STAFF");
      const data = await res.json();
      if (res.ok) setStaff(data);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  };

  const fetchShiftTemplates = async () => {
    try {
      const res = await fetch("/api/admin/shift-templates?isActive=true");
      const data = await res.json();
      if (res.ok) setShiftTemplates(data.templates);
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    }
  };

  // Calendar month navigation — syncs startDate/endDate so useEffect re-fetches
  const handleCalendarMonthChange = (year: number, month: number) => {
    setCalendarMonth({ year, month });
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    setStartDate(first.toISOString().split("T")[0]);
    setEndDate(last.toISOString().split("T")[0]);
  };

  // Clicking a calendar date opens the Create modal with that date pre-filled
  const handleCalendarDateClick = (dateKey: string) => {
    setCreateForm((prev) => ({ ...prev, date: dateKey, endDate: "", isBulk: false }));
    setIsCreateModalOpen(true);
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const payload: any = {
        staffId: createForm.staffId,
        shiftTemplateId: createForm.shiftTemplateId,
        notes: createForm.notes || undefined,
      };

      if (createForm.isBulk) {
        payload.isBulk = true;
        payload.startDate = new Date(createForm.date).toISOString();
        payload.endDate = new Date(createForm.endDate).toISOString();
      } else {
        payload.date = new Date(createForm.date).toISOString();
      }

      const res = await fetch("/api/admin/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create schedule");

      await fetchSchedules();
      setIsCreateModalOpen(false);
      setCreateForm({
        staffId: "",
        shiftTemplateId: "",
        date: "",
        endDate: "",
        isBulk: false,
        notes: "",
      });
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAutoGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setAutoGenError("");
    setGenerating(true);

    try {
      const res = await fetch("/api/admin/schedules/auto-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobType: autoGenForm.jobType,
          startDate: new Date(autoGenForm.startDate).toISOString(),
          endDate: new Date(autoGenForm.endDate).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to generate schedules");

      toast.success(t('schedules_generated', { created: data.result.created, skipped: data.result.skipped }));
      await fetchSchedules();
      setIsAutoGenModalOpen(false);
      setAutoGenForm({
        jobType: "SECURITY",
        startDate: "",
        endDate: "",
      });
    } catch (err: any) {
      setAutoGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/schedules/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to delete schedule");

      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteTargetId(null);
    }
  };

  const selectedStaff = staff.find((s) => s.id === createForm.staffId);
  const availableTemplates = selectedStaff
    ? shiftTemplates.filter((t) => t.jobType === selectedStaff.staffJobType)
    : [];

  const columns: Column<Schedule>[] = [
    {
      key: "date",
      header: t('date'),
      render: (_, row) => (
        <span className="font-medium">
          {new Date(row.date).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      ),
    },
    {
      key: "staff",
      header: t('staff'),
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.staff.name}</div>
          <div className="text-sm text-gray-500">
            {tCommon(`job_types.${row.staff.staffJobType}`)}
          </div>
        </div>
      ),
    },
    {
      key: "shift",
      header: t('shift'),
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.shiftTemplate.shiftName}</div>
          <div className="text-sm text-gray-500">
            {row.shiftTemplate.startTime} - {row.shiftTemplate.endTime}
          </div>
        </div>
      ),
    },
    {
      key: "notes",
      header: tCommon('table.notes'),
      render: (_, row) =>
        row.notes ? (
          <span className="text-sm text-gray-600">{row.notes}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "actions",
      header: tCommon('table.actions'),
      render: (_, row) => (
        <button
          onClick={() => setDeleteTargetId(row.id)}
          className="text-red-600 hover:text-red-700"
          title={tCommon('actions.delete')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle pill */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <List className="w-4 h-4" />
              {t("view_table")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === "calendar"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              {t("view_calendar")}
            </button>
          </div>

          <Button onClick={() => setIsAutoGenModalOpen(true)} variant="secondary">
            <Sparkles className="w-4 h-4 mr-2" />
            {t('auto_generate')}
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('create_assignment')}
          </Button>
        </div>
      </div>

      {/* Date Range Filter — table view only */}
      {viewMode === "table" && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
          <h3 className="font-semibold text-gray-900">{t('date_range')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('start_date')}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label={t('end_date')}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table view */}
      {viewMode === "table" && (
        loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedData}
              keyExtractor={(row) => row.id}
              emptyMessage={t('no_schedules')}
            />
            {paginatedData.length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
                totalItems={totalItems}
              />
            )}
          </>
        )
      )}

      {/* Calendar view */}
      {viewMode === "calendar" && (
        <ScheduleCalendar
          year={calendarMonth.year}
          month={calendarMonth.month}
          schedulesByDate={schedulesByDate}
          loading={loading}
          onMonthChange={handleCalendarMonthChange}
          onDateClick={handleCalendarDateClick}
          onDeleteClick={(id) => setDeleteTargetId(id)}
        />
      )}

      {/* Create Schedule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('assign_shift')}
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          {/* Staff */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('staff_label')} *
            </label>
            <select
              value={createForm.staffId}
              onChange={(e) => setCreateForm({ ...createForm, staffId: e.target.value, shiftTemplateId: "" })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">{t('select_staff')}</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({tCommon(`job_types.${s.staffJobType}`)})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('shift_label')} *
            </label>
            <select
              value={createForm.shiftTemplateId}
              onChange={(e) =>
                setCreateForm({ ...createForm, shiftTemplateId: e.target.value })
              }
              required
              disabled={!createForm.staffId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">{t('select_shift')}</option>
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.shiftName} ({template.startTime} - {template.endTime})
                </option>
              ))}
            </select>
            {!createForm.staffId && (
              <p className="text-xs text-gray-500 mt-1">{t('staff_required')}</p>
            )}
            {createForm.staffId && availableTemplates.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">{t('no_shifts_available')}</p>
            )}
          </div>

          {/* Bulk Toggle */}
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={createForm.isBulk}
              onChange={(e) =>
                setCreateForm({ ...createForm, isBulk: e.target.checked })
              }
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">
              {tCommon('messages.assign_bulk')}
            </span>
          </label>

          {/* Date(s) */}
          {createForm.isBulk ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label={t('start_date_label')}
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                required
              />
              <Input
                label={t('end_date_label')}
                type="date"
                value={createForm.endDate}
                onChange={(e) =>
                  setCreateForm({ ...createForm, endDate: e.target.value })
                }
                required
              />
            </div>
          ) : (
            <Input
              label={t('date_label')}
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              required
            />
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tCommon('labels.notes')}
            </label>
            <textarea
              value={createForm.notes}
              onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
              rows={2}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Error */}
          {createError && <div className="text-red-600 text-sm">{createError}</div>}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? t('creating') : t('assign')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Auto-Generate Modal */}
      <Modal
        isOpen={isAutoGenModalOpen}
        onClose={() => setIsAutoGenModalOpen(false)}
        title={t('auto_generate_title')}
      >
        <form onSubmit={handleAutoGenerate} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <p>
              {t('auto_generate_help')}
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong>{t('security_rotation')}:</strong> {t('rotation_help')}
              </li>
              <li>
                <strong>{t('other_jobs')}:</strong> {t('other_help')}
              </li>
            </ul>
            <p className="mt-2">{tCommon('messages.no_duplicates')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('job_type')} *
            </label>
            <select
              value={autoGenForm.jobType}
              onChange={(e) =>
                setAutoGenForm({ ...autoGenForm, jobType: e.target.value as JobType })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="SECURITY">{tCommon('job_types.SECURITY')}</option>
              <option value="CLEANING">{tCommon('job_types.CLEANING')}</option>
              <option value="GARDENING">{tCommon('job_types.GARDENING')}</option>
              <option value="MAINTENANCE">{tCommon('job_types.MAINTENANCE')}</option>
              <option value="OTHER">{tCommon('job_types.OTHER')}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('start_date_label')}
              type="date"
              value={autoGenForm.startDate}
              onChange={(e) =>
                setAutoGenForm({ ...autoGenForm, startDate: e.target.value })
              }
              required
            />
            <Input
              label={t('end_date_label')}
              type="date"
              value={autoGenForm.endDate}
              onChange={(e) =>
                setAutoGenForm({ ...autoGenForm, endDate: e.target.value })
              }
              required
            />
          </div>

          {/* Error */}
          {autoGenError && <div className="text-red-600 text-sm">{autoGenError}</div>}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsAutoGenModalOpen(false)}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" disabled={generating}>
              {generating ? t('generating') : t('generate')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && handleDeleteSchedule(deleteTargetId)}
        title={t('delete_confirmation')}
        message={t('delete_confirmation')}
        variant="danger"
        confirmText={tCommon('actions.delete')}
        cancelText={tCommon('actions.cancel')}
      />
    </div>
  );
}
