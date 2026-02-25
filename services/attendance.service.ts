import { prisma } from "@/lib/prisma";
import { getCachedGeofenceConfig } from "@/lib/cache/geofence";
import { calculateLateMinutes as calcLate } from "./shiftTemplate.service";
import { JobType } from "@prisma/client";

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance;
}

/**
 * Validate geolocation is within geofence radius
 * Throws error if outside radius
 */
export async function validateGeolocation(lat: number, lon: number): Promise<void> {
  const config = await getCachedGeofenceConfig();

  const distance = calculateDistance(
    config.centerLat,
    config.centerLon,
    lat,
    lon
  );

  if (distance > config.radiusMeters) {
    throw new Error(
      `Lokasi Anda ${Math.round(distance)}m dari pusat kantor. Harus dalam radius ${config.radiusMeters}m.`
    );
  }
}

/**
 * Clock in a staff member
 * Creates a new attendance record with clock-in data
 */
export async function clockIn(
  staffId: string,
  shiftStartTime: string, // HH:mm format
  lat: number,
  lon: number,
  photoUrl: string,
  scheduleId?: string
) {
  // Validate geolocation
  await validateGeolocation(lat, lon);

  // Check for existing active shift
  const activeShift = await prisma.attendance.findFirst({
    where: {
      staffId,
      clockOutAt: null,
    },
  });

  if (activeShift) {
    throw new Error("Staff already has an active shift. Clock out first.");
  }

  // If schedule provided, validate and calculate lateness
  let lateMinutes: number | null = null;
  let schedule = null;

  if (scheduleId) {
    schedule = await prisma.staffSchedule.findUnique({
      where: { id: scheduleId },
      include: { shiftTemplate: true },
    });

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    if (schedule.staffId !== staffId) {
      throw new Error("Schedule does not belong to this staff member");
    }

    // Calculate lateness
    lateMinutes = calcLate(
      schedule.shiftTemplate.startTime,
      schedule.shiftTemplate.toleranceMinutes,
      new Date()
    );
  }

  // Create attendance record
  const attendance = await prisma.attendance.create({
    data: {
      staffId,
      clockInAt: new Date(),
      shiftStartTime,
      scheduleId: scheduleId || null,
      lateMinutes,
      clockInLat: lat,
      clockInLon: lon,
      clockInPhoto: photoUrl,
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
      schedule: {
        include: {
          shiftTemplate: true,
        },
      },
    },
  });

  return attendance;
}

/**
 * Clock out a staff member
 * Updates the active attendance record with clock-out data
 */
export async function clockOut(
  staffId: string,
  lat: number,
  lon: number,
  photoUrl: string
) {
  // Validate geolocation
  await validateGeolocation(lat, lon);

  // Find active shift
  const activeShift = await prisma.attendance.findFirst({
    where: {
      staffId,
      clockOutAt: null,
    },
  });

  if (!activeShift) {
    throw new Error("No active shift found. Clock in first.");
  }

  // Update attendance record with clock-out data
  const attendance = await prisma.attendance.update({
    where: { id: activeShift.id },
    data: {
      clockOutAt: new Date(),
      clockOutLat: lat,
      clockOutLon: lon,
      clockOutPhoto: photoUrl,
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
    },
  });

  return attendance;
}

/**
 * Get active shift for a staff member
 * Returns null if no active shift
 */
export async function getActiveShift(staffId: string) {
  const attendance = await prisma.attendance.findFirst({
    where: {
      staffId,
      clockOutAt: null,
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
      shiftReports: {
        orderBy: { reportedAt: "desc" },
      },
    },
  });

  return attendance;
}

/**
 * Get attendance history for a staff member
 */
export async function getAttendanceHistory(staffId: string, limit = 10) {
  const attendances = await prisma.attendance.findMany({
    where: { staffId },
    orderBy: { clockInAt: "desc" },
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
      shiftReports: {
        select: {
          id: true,
          reportType: true,
          reportedAt: true,
        },
      },
    },
  });

  return attendances;
}

/**
 * Get all attendance records (admin function)
 * Supports filtering by staffId, date range
 */
export async function getAllAttendance(filters?: {
  staffId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};

  if (filters?.staffId) {
    where.staffId = filters.staffId;
  }

  if (filters?.startDate || filters?.endDate) {
    where.clockInAt = {};
    if (filters.startDate) {
      where.clockInAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.clockInAt.lte = filters.endDate;
    }
  }

  const attendances = await prisma.attendance.findMany({
    where,
    orderBy: { clockInAt: "desc" },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          staffJobType: true,
        },
      },
      shiftReports: {
        select: {
          id: true,
          reportType: true,
          reportedAt: true,
        },
      },
    },
  });

  return attendances;
}

/**
 * Get all attendance records with enhanced filtering (admin function)
 * Supports filtering by staffId, jobType, date range, late only
 */
export async function getAllAttendanceEnhanced(filters?: {
  staffId?: string;
  jobType?: JobType;
  startDate?: Date;
  endDate?: Date;
  lateOnly?: boolean;
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

  if (filters?.startDate || filters?.endDate) {
    where.clockInAt = {};
    if (filters.startDate) {
      where.clockInAt.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.clockInAt.lte = filters.endDate;
    }
  }

  if (filters?.lateOnly) {
    where.lateMinutes = {
      gt: 0,
    };
  }

  const attendances = await prisma.attendance.findMany({
    where,
    orderBy: { clockInAt: "desc" },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          staffJobType: true,
        },
      },
      schedule: {
        include: {
          shiftTemplate: true,
        },
      },
      shiftReports: {
        select: {
          id: true,
          reportType: true,
          reportedAt: true,
        },
      },
    },
  });

  return attendances;
}

/**
 * Get all staff currently on duty (clocked in, not yet clocked out)
 * Optionally filter by job type (e.g. SECURITY)
 */
export async function getOnDutyStaff(jobType?: JobType) {
  return prisma.attendance.findMany({
    where: {
      clockOutAt: null,
      staff: {
        role: "STAFF",
        ...(jobType ? { staffJobType: jobType } : {}),
      },
    },
    orderBy: { clockInAt: "asc" },
    include: {
      staff: { select: { id: true, name: true, staffJobType: true, phone: true } },
      schedule: {
        include: {
          shiftTemplate: { select: { shiftName: true, startTime: true, endTime: true } },
        },
      },
    },
  });
}

/**
 * Get attendance statistics for a date range
 */
export async function getAttendanceStats(
  startDate: Date,
  endDate: Date,
  staffId?: string
) {
  const where: any = {
    clockInAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (staffId) {
    where.staffId = staffId;
  }

  const attendances = await prisma.attendance.findMany({
    where,
    select: {
      id: true,
      clockInAt: true,
      clockOutAt: true,
      lateMinutes: true,
    },
  });

  const total = attendances.length;
  const completed = attendances.filter((a) => a.clockOutAt !== null).length;
  const inProgress = total - completed;
  const lateAttendances = attendances.filter(
    (a) => a.lateMinutes && a.lateMinutes > 0
  );
  const lateCount = lateAttendances.length;
  const totalLateMinutes = lateAttendances.reduce(
    (sum, a) => sum + (a.lateMinutes || 0),
    0
  );
  const averageLateMinutes =
    lateCount > 0 ? Math.round(totalLateMinutes / lateCount) : 0;

  return {
    total,
    completed,
    inProgress,
    lateCount,
    totalLateMinutes,
    averageLateMinutes,
  };
}
