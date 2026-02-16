"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { JobType, ShiftReportType } from "@prisma/client";
import Table, { Column, Pagination } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import { ImageModal } from "@/components/ui/ImageModal";
import { Image as ImageIcon } from "lucide-react";
import { usePagination } from "@/lib/hooks/usePagination";

export const dynamic = 'force-dynamic';

interface ShiftReport {
  id: string;
  reportType: ShiftReportType;
  content: string;
  photoUrl: string | null;
  reportedAt: string;
  staff: {
    id: string;
    name: string;
    staffJobType: JobType;
  };
}

export default function AdminShiftReportsPage() {
  const t = useTranslations('staff.reports');
  const tCommon = useTranslations('common');
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [jobTypeFilter, setJobTypeFilter] = useState<JobType | "ALL">("ALL");
  const [reportTypeFilter, setReportTypeFilter] = useState<ShiftReportType | "ALL">("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Image modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Pagination
  const {
    currentPage,
    pageSize,
    handlePageChange,
    handlePageSizeChange,
    paginatedData,
    totalPages,
    totalItems,
  } = usePagination(reports, {
    initialPageSize: 25,
    resetDeps: [jobTypeFilter, reportTypeFilter, startDate, endDate],
  });

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTypeFilter, reportTypeFilter, startDate, endDate]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (jobTypeFilter !== "ALL") params.append("jobType", jobTypeFilter);
      if (reportTypeFilter !== "ALL") params.append("reportType", reportTypeFilter);
      if (startDate) params.append("startDate", new Date(startDate).toISOString());
      if (endDate) params.append("endDate", new Date(endDate).toISOString());

      const res = await fetch(`/api/shift-reports?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch reports");

      setReports(data.reports);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReportTypeBadgeVariant = (type: ShiftReportType) => {
    switch (type) {
      case "SHIFT_START":
        return "success";
      case "SHIFT_MIDDLE":
        return "warning";
      case "SHIFT_END":
        return "danger";
      default:
        return "default";
    }
  };

  const getReportTypeLabel = (type: ShiftReportType) => {
    return t(`types.${type}`);
  };

  const columns: Column<ShiftReport>[] = [
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
      key: "type",
      header: t('type'),
      render: (_, row) => (
        <Badge variant={getReportTypeBadgeVariant(row.reportType)}>
          {getReportTypeLabel(row.reportType)}
        </Badge>
      ),
    },
    {
      key: "report",
      header: t('report'),
      render: (_, row) => (
        <div className="max-w-md">
          <p className="text-sm text-gray-700 line-clamp-2">{row.content}</p>
        </div>
      ),
    },
    {
      key: "photo",
      header: t('photo'),
      render: (_, row) =>
        row.photoUrl ? (
          <button
            onClick={() => setSelectedImage(row.photoUrl!)}
            className="text-primary-600 hover:text-primary-700"
            title={t('view_photo')}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        ),
    },
    {
      key: "reportedAt",
      header: t('reported_at'),
      render: (_, row) => (
        <div className="text-sm">{formatDateTime(row.reportedAt)}</div>
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-500 mt-1">{t('subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-semibold text-gray-900">{tCommon('filters.title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tCommon('labels.job_type')}
            </label>
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value as JobType | "ALL")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">{t('all_jobs')}</option>
              <option value="SECURITY">{tCommon('job_types.SECURITY')}</option>
              <option value="CLEANING">{tCommon('job_types.CLEANING')}</option>
              <option value="GARDENING">{tCommon('job_types.GARDENING')}</option>
              <option value="MAINTENANCE">{tCommon('job_types.MAINTENANCE')}</option>
              <option value="OTHER">{tCommon('job_types.OTHER')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tCommon('labels.report_type')}
            </label>
            <select
              value={reportTypeFilter}
              onChange={(e) =>
                setReportTypeFilter(e.target.value as ShiftReportType | "ALL")
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">{t('all_types')}</option>
              <option value="SHIFT_START">{t('types.SHIFT_START')}</option>
              <option value="SHIFT_MIDDLE">{t('types.SHIFT_MIDDLE')}</option>
              <option value="SHIFT_END">{t('types.SHIFT_END')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('start_date')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('end_date')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
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
        emptyMessage={t('no_reports')}
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

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          isOpen={!!selectedImage}
          imageSrc={selectedImage}
          onClose={() => setSelectedImage(null)}
          altText={t('report_photo')}
        />
      )}
    </div>
  );
}
