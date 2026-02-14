"use client";

import { useState, useEffect } from "react";
import { JobType } from "@prisma/client";
import Table, { Column, Pagination } from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ImageModal } from "@/components/ui/ImageModal";
import { Download, MapPin, Image as ImageIcon } from "lucide-react";
import { usePagination } from "@/lib/hooks/usePagination";
import { exportCSV, mapAttendancesForExport } from "@/lib/utils/export";

interface Attendance {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  lateMinutes: number | null;
  clockInPhoto: string;
  clockOutPhoto: string | null;
  clockInLat: number;
  clockInLon: number;
  clockOutLat: number | null;
  clockOutLon: number | null;
  staff: {
    id: string;
    name: string;
    staffJobType: JobType;
  };
  schedule: {
    shiftTemplate: {
      shiftName: string;
      startTime: string;
      endTime: string;
    };
  } | null;
}

export default function AdminAttendancePage() {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [jobTypeFilter, setJobTypeFilter] = useState<JobType | "ALL">("ALL");
  const [lateOnly, setLateOnly] = useState(false);
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
  } = usePagination(attendances, {
    initialPageSize: 25,
    resetDeps: [jobTypeFilter, lateOnly, startDate, endDate],
  });

  useEffect(() => {
    fetchAttendances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobTypeFilter, lateOnly, startDate, endDate]);

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (jobTypeFilter !== "ALL") params.append("jobType", jobTypeFilter);
      if (lateOnly) params.append("lateOnly", "true");
      if (startDate) params.append("startDate", new Date(startDate).toISOString());
      if (endDate) params.append("endDate", new Date(endDate).toISOString());

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch attendances");

      setAttendances(data.attendances);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const { headers, rows } = mapAttendancesForExport(attendances);
      const filename = `attendance_${new Date().toISOString().split("T")[0]}.csv`;
      exportCSV(filename, headers, rows);
    } catch (err: any) {
      alert("Failed to export CSV: " + err.message);
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

  const calculateDuration = (clockIn: string, clockOut: string | null) => {
    if (!clockOut) return "-";

    const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  const columns: Column<Attendance>[] = [
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
      key: "schedule",
      header: "Shift",
      render: (_, row) =>
        row.schedule ? (
          <div>
            <div className="font-medium">{row.schedule.shiftTemplate.shiftName}</div>
            <div className="text-sm text-gray-500">
              {row.schedule.shiftTemplate.startTime} - {row.schedule.shiftTemplate.endTime}
            </div>
          </div>
        ) : (
          <Badge variant="default">Manual</Badge>
        ),
    },
    {
      key: "clockInAt",
      header: "Clock In",
      render: (_, row) => (
        <div className="space-y-1">
          <div className="text-sm">{formatDateTime(row.clockInAt)}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedImage(row.clockInPhoto)}
              className="text-primary-600 hover:text-primary-700"
              title="View photo"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <a
              href={`https://www.google.com/maps?q=${row.clockInLat},${row.clockInLon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700"
              title="View location"
            >
              <MapPin className="w-4 h-4" />
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "clockOutAt",
      header: "Clock Out",
      render: (_, row) =>
        row.clockOutAt ? (
          <div className="space-y-1">
            <div className="text-sm">{formatDateTime(row.clockOutAt)}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedImage(row.clockOutPhoto!)}
                className="text-primary-600 hover:text-primary-700"
                title="View photo"
              >
                <ImageIcon className="w-4 h-4" />
              </button>
              <a
                href={`https://www.google.com/maps?q=${row.clockOutLat},${row.clockOutLon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-700"
                title="View location"
              >
                <MapPin className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <Badge variant="warning">In Progress</Badge>
        ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (_, row) => calculateDuration(row.clockInAt, row.clockOutAt),
    },
    {
      key: "lateMinutes",
      header: "Status",
      render: (_, row) =>
        row.lateMinutes && row.lateMinutes > 0 ? (
          <Badge variant="danger">Late {row.lateMinutes} min</Badge>
        ) : (
          <Badge variant="success">On Time</Badge>
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
          <h1 className="text-3xl font-bold text-gray-900">Staff Attendance</h1>
          <p className="text-gray-500 mt-1">View and manage staff attendance records</p>
        </div>
        <Button onClick={handleExportCSV} variant="secondary">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
        <h3 className="font-semibold text-gray-900">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Type
            </label>
            <select
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value as JobType | "ALL")}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="ALL">All Job Types</option>
              <option value="SECURITY">Security</option>
              <option value="CLEANING">Cleaning</option>
              <option value="GARDENING">Gardening</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
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
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={lateOnly}
                onChange={(e) => setLateOnly(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">Late Only</span>
            </label>
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
        emptyMessage="No attendance records found"
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
          altText="Attendance Photo"
        />
      )}
    </div>
  );
}
