"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ActiveShift {
  id: string;
  clockInAt: string;
  shiftStartTime: string;
  shiftReports: Array<{ reportType: string }>;
}

export default function StaffDashboard() {
  const router = useRouter();
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch active shift
      const activeRes = await fetch("/api/attendance/active");
      const activeData = await activeRes.json();
      setActiveShift(activeData.activeShift);

      // Fetch recent history
      const historyRes = await fetch("/api/attendance/history?limit=5");
      const historyData = await historyRes.json();
      setAttendanceHistory(historyData.history || []);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReportStatus = (shift: any) => {
    const reportTypes = shift.shiftReports?.map((r: any) => r.reportType) || [];
    return {
      start: reportTypes.includes("SHIFT_START"),
      middle: reportTypes.includes("SHIFT_MIDDLE"),
      end: reportTypes.includes("SHIFT_END"),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Shift Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h2>
        {activeShift ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-900">On Shift</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Clocked In</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(activeShift.clockInAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duration</p>
                <p className="text-sm font-medium text-gray-900">
                  {calculateDuration(activeShift.clockInAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Shift Start</p>
                <p className="text-sm font-medium text-gray-900">
                  {activeShift.shiftStartTime}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Reports Submitted</p>
                <p className="text-sm font-medium text-gray-900">
                  {activeShift.shiftReports?.length || 0} / 3
                </p>
              </div>
            </div>

            {/* Report Status */}
            {activeShift.shiftReports && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-700 mb-2">Report Status:</p>
                <div className="flex gap-2">
                  {["START", "MIDDLE", "END"].map((type) => {
                    const submitted = activeShift.shiftReports.some(
                      (r: any) => r.reportType === `SHIFT_${type}`
                    );
                    return (
                      <div
                        key={type}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          submitted
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {submitted ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {type}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Not currently on shift</p>
            <p className="text-xs text-gray-500 mt-1">
              Go to Attendance to clock in
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push("/staff/reports")}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-6 text-left transition-colors shadow-sm"
        >
          <FileText className="w-8 h-8 mb-3" />
          <p className="font-semibold">Submit Report</p>
          <p className="text-xs text-blue-100 mt-1">Add shift report</p>
        </button>
        <button
          onClick={() => router.push("/staff/unpaid-residents")}
          className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg p-6 text-left transition-colors shadow-sm"
        >
          <AlertCircle className="w-8 h-8 mb-3" />
          <p className="font-semibold">Unpaid List</p>
          <p className="text-xs text-amber-100 mt-1">View unpaid residents</p>
        </button>
      </div>

      {/* Recent Attendance */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Attendance
        </h2>
        {attendanceHistory.length > 0 ? (
          <div className="space-y-3">
            {attendanceHistory.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(record.clockInAt)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Shift: {record.shiftStartTime}
                  </p>
                </div>
                <div className="text-right">
                  {record.clockOutAt ? (
                    <>
                      <p className="text-xs text-gray-500">Clocked out</p>
                      <p className="text-xs font-medium text-gray-700">
                        {formatDate(record.clockOutAt)}
                      </p>
                    </>
                  ) : (
                    <span className="text-xs text-green-600 font-medium">
                      Active
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No attendance records yet
          </p>
        )}
      </div>
    </div>
  );
}
