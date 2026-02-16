"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { JobType } from "@prisma/client";
import Table, { Column } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import { Plus, Edit, Trash2 } from "lucide-react";

export const dynamic = 'force-dynamic';

interface ShiftTemplate {
  id: string;
  jobType: JobType;
  shiftName: string;
  startTime: string;
  endTime: string;
  toleranceMinutes: number;
  requiredStaffCount: number;
  isActive: boolean;
}

export default function ShiftTemplatesPage() {
  const t = useTranslations('staff.shifts');
  const tCommon = useTranslations('common');
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ShiftTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    jobType: "SECURITY" as JobType,
    shiftName: "",
    startTime: "",
    endTime: "",
    toleranceMinutes: 15,
    requiredStaffCount: 1,
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/admin/shift-templates");
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch templates");

      setTemplates(data.templates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (template?: ShiftTemplate) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        jobType: template.jobType,
        shiftName: template.shiftName,
        startTime: template.startTime,
        endTime: template.endTime,
        toleranceMinutes: template.toleranceMinutes,
        requiredStaffCount: template.requiredStaffCount,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        jobType: "SECURITY",
        shiftName: "",
        startTime: "",
        endTime: "",
        toleranceMinutes: 15,
        requiredStaffCount: 1,
      });
    }
    setFormError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      const url = editingTemplate
        ? `/api/admin/shift-templates/${editingTemplate.id}`
        : "/api/admin/shift-templates";

      const method = editingTemplate ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to save template");

      await fetchTemplates();
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('delete_confirmation'))) return;

    try {
      const res = await fetch(`/api/admin/shift-templates/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to delete template");

      await fetchTemplates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const columns: Column<ShiftTemplate>[] = [
    {
      key: "jobType",
      header: t('job_type'),
      render: (_, row) => (
        <Badge variant="info">{tCommon(`job_types.${row.jobType}`)}</Badge>
      ),
    },
    {
      key: "shiftName",
      header: t('shift_name'),
      render: (_, row) => (
        <span className="font-medium">{row.shiftName}</span>
      ),
    },
    {
      key: "time",
      header: tCommon('labels.time'),
      render: (_, row) => (
        <span className="text-sm">
          {row.startTime} - {row.endTime}
        </span>
      ),
    },
    {
      key: "tolerance",
      header: t('tolerance'),
      render: (_, row) => (
        <span className="text-sm">{row.toleranceMinutes} {tCommon('time.minutes')}</span>
      ),
    },
    {
      key: "requiredStaff",
      header: t('required_staff'),
      render: (_, row) => (
        <span className="text-sm font-medium">{row.requiredStaffCount} {tCommon('labels.staff')}</span>
      ),
    },
    {
      key: "status",
      header: tCommon('table.status'),
      render: (_, row) => (
        <Badge variant={row.isActive ? "success" : "default"}>
          {row.isActive ? t('active') : t('inactive')}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: tCommon('table.actions'),
      render: (_, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenModal(row)}
            className="text-primary-600 hover:text-primary-700"
            title={tCommon('actions.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="text-red-600 hover:text-red-700"
            title={tCommon('actions.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
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
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          {t('add_template')}
        </Button>
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
        data={templates}
        keyExtractor={(row) => row.id}
        emptyMessage={t('no_templates')}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTemplate ? t('edit_template') : tCommon('actions.create') + ' ' + t('add_template')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('job_type')}
            </label>
            <select
              value={formData.jobType}
              onChange={(e) =>
                setFormData({ ...formData, jobType: e.target.value as JobType })
              }
              disabled={!!editingTemplate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="SECURITY">{tCommon('job_types.SECURITY')}</option>
              <option value="CLEANING">{tCommon('job_types.CLEANING')}</option>
              <option value="GARDENING">{tCommon('job_types.GARDENING')}</option>
              <option value="MAINTENANCE">{tCommon('job_types.MAINTENANCE')}</option>
              <option value="OTHER">{tCommon('job_types.OTHER')}</option>
            </select>
            {editingTemplate && (
              <p className="text-xs text-gray-500 mt-1">
                {tCommon('messages.job_type_immutable')}
              </p>
            )}
          </div>

          {/* Shift Name */}
          <Input
            label={t('shift_name_label')}
            type="text"
            value={formData.shiftName}
            onChange={(e) => setFormData({ ...formData, shiftName: e.target.value })}
            required
            placeholder={t('shift_name_placeholder')}
          />

          {/* Start Time */}
          <Input
            label={t('start_time_label')}
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
          />

          {/* End Time */}
          <Input
            label={t('end_time_label')}
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            required
          />

          {/* Tolerance and Required Staff Count */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('tolerance_label')}
              type="number"
              min="0"
              max="120"
              value={formData.toleranceMinutes}
              onChange={(e) =>
                setFormData({ ...formData, toleranceMinutes: parseInt(e.target.value) })
              }
              required
              helperText={t('tolerance_help')}
            />

            <Input
              label={t('required_staff_label')}
              type="number"
              min="1"
              max="20"
              value={formData.requiredStaffCount}
              onChange={(e) =>
                setFormData({ ...formData, requiredStaffCount: parseInt(e.target.value) })
              }
              required
              helperText={tCommon('messages.required_staff_help')}
            />
          </div>

          {/* Error */}
          {formError && (
            <div className="text-red-600 text-sm">{formError}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? tCommon('actions.saving') : editingTemplate ? tCommon('actions.update') : tCommon('actions.create')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
