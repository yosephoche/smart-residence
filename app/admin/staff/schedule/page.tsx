"use client";

import { useState, useEffect } from "react";
import { JobType } from "@prisma/client";
import Table, { Column, Pagination } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Plus, Sparkles, Trash2, Calendar } from "lucide-react";
import { usePagination } from "@/lib/hooks/usePagination";

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
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      alert(
        `Success! Created ${data.result.created} schedules, skipped ${data.result.skipped} existing.`
      );
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
    if (!confirm("Are you sure you want to delete this schedule?")) return;

    try {
      const res = await fetch(`/api/admin/schedules/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to delete schedule");

      await fetchSchedules();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const selectedStaff = staff.find((s) => s.id === createForm.staffId);
  const availableTemplates = selectedStaff
    ? shiftTemplates.filter((t) => t.jobType === selectedStaff.staffJobType)
    : [];

  const columns: Column<Schedule>[] = [
    {
      key: "date",
      header: "Date",
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
      header: "Staff",
      render: (_, row) => (
        <div>
          <div className="font-medium">{row.staff.name}</div>
          <div className="text-sm text-gray-500">
            {row.staff.staffJobType.replace("_", " ")}
          </div>
        </div>
      ),
    },
    {
      key: "shift",
      header: "Shift",
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
      header: "Notes",
      render: (_, row) =>
        row.notes ? (
          <span className="text-sm text-gray-600">{row.notes}</span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (_, row) => (
        <button
          onClick={() => handleDeleteSchedule(row.id)}
          className="text-red-600 hover:text-red-700"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staff Schedule</h1>
          <p className="text-gray-500 mt-1">Manage staff shift assignments</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsAutoGenModalOpen(true)} variant="secondary">
            <Sparkles className="w-4 h-4 mr-2" />
            Auto-Generate
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Assign Shift
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-semibold text-gray-900">Date Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <Table
        columns={columns}
        data={paginatedData}
        keyExtractor={(row) => row.id}
        emptyMessage="No schedules found"
      />

      {/* Pagination */}
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

      {/* Create Schedule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Assign Shift"
      >
        <form onSubmit={handleCreateSchedule} className="space-y-4">
          {/* Staff */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff *
            </label>
            <select
              value={createForm.staffId}
              onChange={(e) => setCreateForm({ ...createForm, staffId: e.target.value, shiftTemplateId: "" })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">Select staff</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.staffJobType})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Template */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shift *
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
              <option value="">Select shift</option>
              {availableTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.shiftName} ({t.startTime} - {t.endTime})
                </option>
              ))}
            </select>
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
              Assign to multiple dates (bulk)
            </span>
          </label>

          {/* Date(s) */}
          {createForm.isBulk ? (
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Date *"
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
                required
              />
              <Input
                label="End Date *"
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
              label="Date *"
              type="date"
              value={createForm.date}
              onChange={(e) => setCreateForm({ ...createForm, date: e.target.value })}
              required
            />
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
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
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Assign"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Auto-Generate Modal */}
      <Modal
        isOpen={isAutoGenModalOpen}
        onClose={() => setIsAutoGenModalOpen(false)}
        title="Auto-Generate Schedules"
      >
        <form onSubmit={handleAutoGenerate} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <p>
              Auto-generate will create schedules for all staff of the selected job type.
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>
                <strong>Security:</strong> Rotates 2 shifts evenly across all security
                staff
              </li>
              <li>
                <strong>Others:</strong> Assigns single shift to all staff of that type
              </li>
            </ul>
            <p className="mt-2">Existing schedules will be skipped (no duplicates).</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Type *
            </label>
            <select
              value={autoGenForm.jobType}
              onChange={(e) =>
                setAutoGenForm({ ...autoGenForm, jobType: e.target.value as JobType })
              }
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="SECURITY">Security</option>
              <option value="CLEANING">Cleaning</option>
              <option value="GARDENING">Gardening</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date *"
              type="date"
              value={autoGenForm.startDate}
              onChange={(e) =>
                setAutoGenForm({ ...autoGenForm, startDate: e.target.value })
              }
              required
            />
            <Input
              label="End Date *"
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
              Cancel
            </Button>
            <Button type="submit" disabled={generating}>
              {generating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
