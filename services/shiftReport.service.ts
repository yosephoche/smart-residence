import { prisma } from "@/lib/prisma";
import { ShiftReportType, JobType } from "@prisma/client";

/**
 * Create a shift report
 * Validates that staff has an active shift
 * Prevents duplicate report types for the same shift
 */
export async function createShiftReport(
  staffId: string,
  reportType: ShiftReportType,
  content: string,
  photoUrl?: string
) {
  // Find active shift
  const activeShift = await prisma.attendance.findFirst({
    where: {
      staffId,
      clockOutAt: null,
    },
  });

  if (!activeShift) {
    throw new Error("No active shift found. Clock in first before submitting reports.");
  }

  // Check for duplicate report type for this shift
  const existingReport = await prisma.shiftReport.findFirst({
    where: {
      attendanceId: activeShift.id,
      reportType,
    },
  });

  if (existingReport) {
    throw new Error(
      `A ${reportType.replace("SHIFT_", "").toLowerCase()} report has already been submitted for this shift.`
    );
  }

  // Create shift report
  const report = await prisma.shiftReport.create({
    data: {
      staffId,
      attendanceId: activeShift.id,
      reportType,
      content,
      photoUrl,
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          staffJobType: true,
        },
      },
      attendance: {
        select: {
          id: true,
          clockInAt: true,
          shiftStartTime: true,
        },
      },
    },
  });

  return report;
}

/**
 * Get shift reports for a staff member
 */
export async function getShiftReports(staffId: string, limit = 20) {
  const reports = await prisma.shiftReport.findMany({
    where: { staffId },
    orderBy: { reportedAt: "desc" },
    take: limit,
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          staffJobType: true,
        },
      },
      attendance: {
        select: {
          id: true,
          clockInAt: true,
          clockOutAt: true,
          shiftStartTime: true,
        },
      },
    },
  });

  return reports;
}

/**
 * Get all shift reports (admin function)
 * Supports filtering by staffId, jobType, reportType, date range
 */
export async function getAllShiftReports(filters?: {
  staffId?: string;
  jobType?: JobType;
  reportType?: ShiftReportType;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};

  if (filters?.staffId) {
    where.staffId = filters.staffId;
  }

  if (filters?.jobType) {
    where.staff = {
      staffJobType: filters.jobType,
    };
  }

  if (filters?.reportType) {
    where.reportType = filters.reportType;
  }

  if (filters?.startDate || filters?.endDate) {
    where.reportedAt = {};
    if (filters.startDate) {
      where.reportedAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.reportedAt.lte = filters.endDate;
    }
  }

  const reports = await prisma.shiftReport.findMany({
    where,
    orderBy: { reportedAt: "desc" },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          staffJobType: true,
        },
      },
      attendance: {
        select: {
          id: true,
          clockInAt: true,
          clockOutAt: true,
          shiftStartTime: true,
        },
      },
    },
  });

  return reports;
}

/**
 * Get shift report by ID
 */
export async function getShiftReportById(id: string) {
  const report = await prisma.shiftReport.findUnique({
    where: { id },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          staffJobType: true,
        },
      },
      attendance: {
        select: {
          id: true,
          clockInAt: true,
          clockOutAt: true,
          shiftStartTime: true,
        },
      },
    },
  });

  return report;
}
