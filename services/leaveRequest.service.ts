import { prisma } from "@/lib/prisma";
import { LeaveStatus } from "@prisma/client";
import { getCachedLeaveConfig } from "@/lib/cache/leave-config";

const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // WITA = UTC+8, matches shiftTemplate.service.ts

/**
 * Normalize a date to UTC midnight (for dates already stored as UTC midnight representing WITA calendar dates)
 */
function toUTCMidnight(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Convert a UTC Date to the WITA (UTC+8) calendar date, returned as UTC midnight.
 * Use this when comparing "now" against stored leave dates to avoid the 8-hour UTC/WITA mismatch.
 * Matches the pattern in shiftTemplate.service.ts for consistency.
 */
function toWITACalendarDateUTC(date: Date): Date {
  const witaDate = new Date(date.getTime() + TZ_OFFSET_MS);
  return new Date(
    Date.UTC(witaDate.getUTCFullYear(), witaDate.getUTCMonth(), witaDate.getUTCDate())
  );
}

/**
 * Calculate the number of calendar days between two dates (inclusive)
 */
function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}

/**
 * Check if a staff member is on an approved leave on a given date
 */
export async function isStaffOnApprovedLeave(
  staffId: string,
  date: Date
): Promise<boolean> {
  const normalizedDate = toWITACalendarDateUTC(date);

  const leave = await prisma.staffLeave.findFirst({
    where: {
      staffId,
      status: LeaveStatus.APPROVED,
      startDate: { lte: normalizedDate },
      endDate: { gte: normalizedDate },
    },
  });

  return leave !== null;
}

/**
 * Get leaves for a specific staff member
 */
export async function getLeavesByStaff(
  staffId: string,
  filters?: { status?: LeaveStatus }
) {
  const where: any = { staffId };
  if (filters?.status) {
    where.status = filters.status;
  }

  return prisma.staffLeave.findMany({
    where,
    include: {
      reviewer: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get all leaves (admin view)
 */
export async function getAllLeaves(filters?: {
  status?: LeaveStatus;
  staffId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};

  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.staffId) {
    where.staffId = filters.staffId;
  }
  if (filters?.startDate || filters?.endDate) {
    where.startDate = {};
    if (filters.startDate) {
      where.startDate.gte = toUTCMidnight(filters.startDate);
    }
    if (filters.endDate) {
      where.startDate.lte = toUTCMidnight(filters.endDate);
    }
  }

  return prisma.staffLeave.findMany({
    where,
    include: {
      staff: {
        select: { id: true, name: true, staffJobType: true },
      },
      reviewer: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create a new leave request
 */
export async function createLeaveRequest(
  staffId: string,
  startDateRaw: Date,
  endDateRaw: Date,
  reason: string
) {
  const config = await getCachedLeaveConfig();
  const startDate = toUTCMidnight(startDateRaw);
  const endDate = toUTCMidnight(endDateRaw);
  const today = toUTCMidnight(new Date());

  // 1. Validate minimum advance days
  const minDate = new Date(today);
  minDate.setUTCDate(minDate.getUTCDate() + config.minAdvanceDays);
  if (startDate < minDate) {
    throw new Error(
      `Permintaan cuti harus diajukan minimal ${config.minAdvanceDays} hari sebelumnya.`
    );
  }

  // 2. Validate date order
  if (startDate > endDate) {
    throw new Error("Tanggal mulai harus sebelum atau sama dengan tanggal selesai.");
  }

  // 3. Validate total days
  const totalDays = daysBetween(startDate, endDate);
  if (totalDays > config.maxDaysPerRequest) {
    throw new Error(
      `Maksimum ${config.maxDaysPerRequest} hari per pengajuan cuti.`
    );
  }

  // 4. No overlapping PENDING/APPROVED leave for this staff
  const overlapping = await prisma.staffLeave.findFirst({
    where: {
      staffId,
      status: { in: [LeaveStatus.PENDING, LeaveStatus.APPROVED] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (overlapping) {
    throw new Error(
      "Anda sudah memiliki pengajuan cuti yang aktif atau disetujui pada rentang tanggal tersebut."
    );
  }

  // 5. Prevent 100% staff absence on any day in the range
  const totalStaffCount = await prisma.user.count({
    where: { role: "STAFF" },
  });

  if (totalStaffCount > 1) {
    // For each day in the range, check approved leaves by OTHER staff
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayEnd = new Date(current);
      const approvedOnDay = await prisma.staffLeave.count({
        where: {
          staffId: { not: staffId },
          status: LeaveStatus.APPROVED,
          startDate: { lte: dayEnd },
          endDate: { gte: dayEnd },
        },
      });

      if (approvedOnDay >= totalStaffCount - 1) {
        const dateStr = current.toISOString().split("T")[0];
        throw new Error(
          `Tidak dapat mengajukan cuti. Semua staf lain sudah cuti pada tanggal ${dateStr}.`
        );
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return prisma.staffLeave.create({
    data: {
      staffId,
      startDate,
      endDate,
      totalDays,
      reason,
      status: LeaveStatus.PENDING,
    },
  });
}

/**
 * Approve a leave request
 */
export async function approveLeave(id: string, reviewerId: string) {
  const leave = await prisma.staffLeave.findUnique({ where: { id } });
  if (!leave) {
    throw new Error("Pengajuan cuti tidak ditemukan.");
  }
  if (leave.status !== LeaveStatus.PENDING) {
    throw new Error("Hanya pengajuan berstatus PENDING yang dapat disetujui.");
  }

  // Re-run cap check before approving
  const totalStaffCount = await prisma.user.count({
    where: { role: "STAFF" },
  });

  if (totalStaffCount > 1) {
    const current = new Date(leave.startDate);
    while (current <= leave.endDate) {
      const dayEnd = new Date(current);
      const approvedOnDay = await prisma.staffLeave.count({
        where: {
          id: { not: id },
          staffId: { not: leave.staffId },
          status: LeaveStatus.APPROVED,
          startDate: { lte: dayEnd },
          endDate: { gte: dayEnd },
        },
      });

      if (approvedOnDay >= totalStaffCount - 1) {
        const dateStr = current.toISOString().split("T")[0];
        throw new Error(
          `Tidak dapat menyetujui cuti. Semua staf lain sudah cuti pada tanggal ${dateStr}.`
        );
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return prisma.staffLeave.update({
    where: { id },
    data: {
      status: LeaveStatus.APPROVED,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionNote: null,
    },
    include: {
      staff: { select: { id: true, name: true } },
    },
  });
}

/**
 * Reject a leave request
 */
export async function rejectLeave(
  id: string,
  reviewerId: string,
  rejectionNote?: string
) {
  const leave = await prisma.staffLeave.findUnique({ where: { id } });
  if (!leave) {
    throw new Error("Pengajuan cuti tidak ditemukan.");
  }
  if (leave.status !== LeaveStatus.PENDING) {
    throw new Error("Hanya pengajuan berstatus PENDING yang dapat ditolak.");
  }

  return prisma.staffLeave.update({
    where: { id },
    data: {
      status: LeaveStatus.REJECTED,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionNote: rejectionNote || null,
    },
    include: {
      staff: { select: { id: true, name: true } },
    },
  });
}
