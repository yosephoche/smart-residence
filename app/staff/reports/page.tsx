"use client";

import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, CheckCircle, Clock, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";

interface ShiftReport {
  id: string;
  reportType: string;
  content: string;
  photoUrl: string | null;
  reportedAt: string;
  attendance: {
    clockInAt: string;
    shiftStartTime: string;
  } | null;
}

export default function ShiftReportsPage() {
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [reportType, setReportType] = useState<"SHIFT_START" | "SHIFT_MIDDLE" | "SHIFT_END">("SHIFT_START");
  const [content, setContent] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch active shift
      const activeRes = await fetch("/api/attendance/active");
      const activeData = await activeRes.json();
      setActiveShift(activeData.activeShift);

      // Fetch reports
      const reportsRes = await fetch("/api/shift-reports");
      const reportsData = await reportsRes.json();
      setReports(reportsData.reports || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!activeShift) {
      setError("You must clock in before submitting a report");
      return;
    }

    if (content.length < 10) {
      setError("Report content must be at least 10 characters");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("reportType", reportType);
      formData.append("content", content);
      if (photo) {
        formData.append("photo", photo);
      }

      const res = await fetch("/api/shift-reports", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit report");
      }

      setSuccess("Report submitted successfully!");

      // Reset form
      setContent("");
      setPhoto(null);
      setReportType("SHIFT_START");

      // Refresh reports
      await fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReportTypeBadge = (type: string) => {
    const config = {
      SHIFT_START: { label: "Start", color: "bg-blue-100 text-blue-700" },
      SHIFT_MIDDLE: { label: "Middle", color: "bg-amber-100 text-amber-700" },
      SHIFT_END: { label: "End", color: "bg-green-100 text-green-700" },
    };
    const { label, color } = config[type as keyof typeof config] || { label: type, color: "bg-gray-100 text-gray-700" };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Shift Reports</h1>
        <p className="text-sm text-gray-600 mt-1">
          Submit periodic reports during your shift
        </p>
      </div>

      {/* Submit Report Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Submit Report
        </h2>

        {!activeShift && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-sm text-amber-800">
                You must clock in before you can submit reports
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type <span className="text-red-500">*</span>
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              disabled={!activeShift}
              className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="SHIFT_START">Start of Shift</option>
              <option value="SHIFT_MIDDLE">Middle of Shift</option>
              <option value="SHIFT_END">End of Shift</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Content <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={!activeShift}
              placeholder="Describe your observations, activities, or incidents (min. 10 characters)"
              rows={5}
              className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {content.length} characters (min. 10 required)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo (Optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              disabled={!activeShift}
              className="w-full px-4 py-2.5 text-sm border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {photo && (
              <div className="flex items-center gap-2 mt-2 text-sm text-green-700">
                <CheckCircle className="w-4 h-4" />
                {photo.name}
              </div>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={submitting}
            disabled={!activeShift || content.length < 10}
            fullWidth
          >
            <FileText className="w-5 h-5 mr-2" />
            Submit Report
          </Button>
        </form>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Reports
        </h2>

        {reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  {getReportTypeBadge(report.reportType)}
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {formatDate(report.reportedAt)}
                  </div>
                </div>

                <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">
                  {report.content}
                </p>

                {report.photoUrl && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ImageIcon className="w-4 h-4" />
                    Photo attached
                  </div>
                )}

                {report.attendance && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Shift: {report.attendance.shiftStartTime} -{" "}
                      {formatDate(report.attendance.clockInAt)}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">No Reports Yet</p>
            <p className="text-sm text-gray-500">
              Submit your first shift report above
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
