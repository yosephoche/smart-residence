import { prisma } from "@/lib/prisma";
import { ManualAttendanceStatus } from "@prisma/client";

const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // WITA = UTC+8, matches leaveRequest.service.ts

const MAX_DAYS_BACK = 2;

/** Convert a UTC Date to the WITA (UTC+8) calendar date, returned as UTC midnight. */
function toWITACalendarDateUTC(date: Date): Date {
  const witaDate = new Date(date.getTime() + TZ_OFFSET_MS);
  return new Date(
    Date.UTC(witaDate.getUTCFullYear(), witaDate.getUTCMonth(), witaDate.getUTCDate())
  );
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay);
}

export async function getRequestsByStaff(
  staffId: string,
  filters?: { status?: ManualAttendanceStatus }
) {
  const where: any = { staffId };
  if (filters?.status) {
    where.status = filters.status;
  }

  return prisma.manualAttendanceRequest.findMany({
    where,
    include: {
      reviewer: { select: { id: true, name: true } },
      schedule: { include: { shiftTemplate: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllManualAttendanceRequests(filters?: {
  status?: ManualAttendanceStatus;
  staffId?: string;
}) {
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.staffId) where.staffId = filters.staffId;

  return prisma.manualAttendanceRequest.findMany({
    where,
    include: {
      staff: { select: { id: true, name: true, staffJobType: true } },
      reviewer: { select: { id: true, name: true } },
      schedule: { include: { shiftTemplate: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * A staff member can have more than one StaffSchedule on the same date
 * (e.g. security working a double shift), so the date alone doesn't pick a
 * schedule — the one that still has no Attendance and no pending/approved
 * request is the one a backfill request must mean. Ordered by shift start
 * time so the earliest still-open shift wins when more than one qualifies.
 */
async function findBackfillableSchedule(staffId: string, date: Date) {
  const schedules = await prisma.staffSchedule.findMany({
    where: { staffId, date },
    include: { shiftTemplate: true },
    orderBy: { shiftTemplate: { startTime: "asc" } },
  });

  for (const schedule of schedules) {
    const [existingAttendance, existingRequest] = await Promise.all([
      prisma.attendance.findFirst({ where: { scheduleId: schedule.id } }),
      prisma.manualAttendanceRequest.findFirst({
        where: {
          scheduleId: schedule.id,
          status: { in: [ManualAttendanceStatus.PENDING, ManualAttendanceStatus.APPROVED] },
        },
      }),
    ]);

    if (!existingAttendance && !existingRequest) {
      return schedule;
    }
  }

  return null;
}

/**
 * Create a manual (backfill) attendance request. The requested date must
 * already have a StaffSchedule — this never creates one, since schedules are
 * expected to be populated ahead of time (directly or via copy-schedule).
 */
export async function createManualAttendanceRequest(
  staffId: string,
  dateRaw: Date,
  clockInAt: Date,
  clockOutAt: Date,
  reason: string
) {
  const date = toWITACalendarDateUTC(dateRaw);
  const today = toWITACalendarDateUTC(new Date());

  const daysAgo = daysBetween(date, today);
  if (daysAgo <= 0) {
    throw new Error("Tanggal harus di masa lalu, bukan hari ini atau mendatang.");
  }
  if (daysAgo > MAX_DAYS_BACK) {
    throw new Error(`Maksimum pengajuan untuk ${MAX_DAYS_BACK} hari ke belakang.`);
  }

  const anyScheduleThatDate = await prisma.staffSchedule.findFirst({ where: { staffId, date } });
  if (!anyScheduleThatDate) {
    throw new Error(
      "Tidak ada jadwal untuk tanggal ini. Hubungi admin untuk menetapkan jadwal sebelum mengajukan absen manual."
    );
  }

  const schedule = await findBackfillableSchedule(staffId, date);
  if (!schedule) {
    throw new Error(
      "Semua jadwal Anda pada tanggal ini sudah tercatat absen atau sudah ada pengajuan absen manual."
    );
  }

  return prisma.manualAttendanceRequest.create({
    data: {
      staffId,
      scheduleId: schedule.id,
      date,
      clockInAt,
      clockOutAt,
      reason,
      status: ManualAttendanceStatus.PENDING,
    },
    include: {
      schedule: { include: { shiftTemplate: true } },
    },
  });
}

/**
 * Approve a manual attendance request. Guarded against double-approval
 * (web + Telegram racing) with a conditional status update checked by
 * affected-row count before the Attendance row is created, all inside one
 * transaction so a losing race never creates a duplicate Attendance.
 */
export async function approveManualAttendanceRequest(id: string, reviewerId: string) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.manualAttendanceRequest.findUnique({
      where: { id },
      include: { schedule: { include: { shiftTemplate: true } } },
    });
    if (!request) {
      throw new Error("Pengajuan absen manual tidak ditemukan.");
    }

    const updated = await tx.manualAttendanceRequest.updateMany({
      where: { id, status: ManualAttendanceStatus.PENDING },
      data: {
        status: ManualAttendanceStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        rejectionNote: null,
      },
    });
    if (updated.count === 0) {
      throw new Error("Hanya pengajuan berstatus PENDING yang dapat disetujui.");
    }

    // Re-check no competing Attendance was created for this schedule since
    // the request was submitted (e.g. a different approval path, or the
    // staff clocking in live in the meantime).
    const existingAttendance = await tx.attendance.findFirst({
      where: { scheduleId: request.scheduleId },
    });
    if (existingAttendance) {
      throw new Error("Absen untuk jadwal ini sudah tercatat sebelumnya.");
    }

    const attendance = await tx.attendance.create({
      data: {
        staffId: request.staffId,
        clockInAt: request.clockInAt,
        clockOutAt: request.clockOutAt,
        shiftStartTime: request.schedule.shiftTemplate.startTime,
        scheduleId: request.scheduleId,
        lateMinutes: null,
        clockInLat: null,
        clockInLon: null,
        clockInPhoto: null,
      },
    });

    return tx.manualAttendanceRequest.update({
      where: { id },
      data: { resultingAttendanceId: attendance.id },
      include: {
        staff: { select: { id: true, name: true } },
        schedule: { include: { shiftTemplate: true } },
      },
    });
  });
}

export async function rejectManualAttendanceRequest(
  id: string,
  reviewerId: string,
  rejectionNote?: string
) {
  const updated = await prisma.manualAttendanceRequest.updateMany({
    where: { id, status: ManualAttendanceStatus.PENDING },
    data: {
      status: ManualAttendanceStatus.REJECTED,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectionNote: rejectionNote || null,
    },
  });

  if (updated.count === 0) {
    const existing = await prisma.manualAttendanceRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Pengajuan absen manual tidak ditemukan.");
    }
    throw new Error("Hanya pengajuan berstatus PENDING yang dapat ditolak.");
  }

  return prisma.manualAttendanceRequest.findUnique({
    where: { id },
    include: {
      staff: { select: { id: true, name: true } },
      schedule: { include: { shiftTemplate: true } },
    },
  });
}

export async function getManualAttendanceRequestById(id: string) {
  return prisma.manualAttendanceRequest.findUnique({
    where: { id },
    include: {
      staff: { select: { id: true, name: true, staffJobType: true } },
      reviewer: { select: { id: true, name: true } },
      schedule: { include: { shiftTemplate: true } },
    },
  });
}
