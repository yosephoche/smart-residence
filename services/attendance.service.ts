import { prisma } from "@/lib/prisma";
import {
  GEOFENCE_RADIUS_METERS,
  RESIDENCE_CENTER_LAT,
  RESIDENCE_CENTER_LON,
} from "@/lib/constants";

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
export function validateGeolocation(lat: number, lon: number): void {
  const distance = calculateDistance(
    RESIDENCE_CENTER_LAT,
    RESIDENCE_CENTER_LON,
    lat,
    lon
  );

  if (distance > GEOFENCE_RADIUS_METERS) {
    throw new Error(
      `Location is ${Math.round(distance)}m from residence center. Must be within ${GEOFENCE_RADIUS_METERS}m radius.`
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
  photoUrl: string
) {
  // Validate geolocation
  validateGeolocation(lat, lon);

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

  // Create attendance record
  const attendance = await prisma.attendance.create({
    data: {
      staffId,
      clockInAt: new Date(),
      shiftStartTime,
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
  validateGeolocation(lat, lon);

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
