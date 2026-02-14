import { prisma } from "@/lib/prisma";
import { JobType } from "@prisma/client";

/**
 * Validate time format (HH:mm 24-hour)
 */
function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Calculate lateness in minutes based on scheduled start time and clock-in time
 * Returns null if on time (within tolerance), or minutes late as positive integer
 */
export function calculateLateMinutes(
  scheduledStartTime: string, // HH:mm format
  toleranceMinutes: number,
  clockInAt: Date
): number | null {
  // Parse scheduled start time
  const [hours, minutes] = scheduledStartTime.split(":").map(Number);

  // Get clock-in date components
  const clockInDate = new Date(clockInAt);

  // Create scheduled start datetime (same date as clock-in, with scheduled time)
  const scheduledStart = new Date(clockInDate);
  scheduledStart.setHours(hours, minutes, 0, 0);

  // Calculate difference in milliseconds
  const diffMs = clockInDate.getTime() - scheduledStart.getTime();
  const diffMinutes = Math.floor(diffMs / 1000 / 60);

  // If clocked in before scheduled time or within tolerance, not late
  if (diffMinutes <= toleranceMinutes) {
    return null;
  }

  // Return minutes late (subtract tolerance)
  return diffMinutes - toleranceMinutes;
}

/**
 * Get all shift templates with optional filters
 */
export async function getAllShiftTemplates(filters?: {
  jobType?: JobType;
  isActive?: boolean;
}) {
  const where: any = {};

  if (filters?.jobType) {
    where.jobType = filters.jobType;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const templates = await prisma.shiftTemplate.findMany({
    where,
    orderBy: [
      { jobType: "asc" },
      { startTime: "asc" },
    ],
  });

  return templates;
}

/**
 * Get shift template by ID
 */
export async function getShiftTemplateById(id: string) {
  const template = await prisma.shiftTemplate.findUnique({
    where: { id },
    include: {
      schedules: {
        where: {
          date: {
            gte: new Date(), // Only future schedules
          },
        },
        take: 5,
      },
    },
  });

  if (!template) {
    throw new Error("Shift template not found");
  }

  return template;
}

/**
 * Get active shift templates for a specific job type
 */
export async function getShiftTemplatesForJobType(jobType: JobType) {
  const templates = await prisma.shiftTemplate.findMany({
    where: {
      jobType,
      isActive: true,
    },
    orderBy: { startTime: "asc" },
  });

  return templates;
}

/**
 * Create a new shift template
 */
export async function createShiftTemplate(data: {
  jobType: JobType;
  shiftName: string;
  startTime: string;
  endTime: string;
  toleranceMinutes?: number;
  requiredStaffCount?: number;
}) {
  // Validate time format
  if (!isValidTimeFormat(data.startTime)) {
    throw new Error("Invalid start time format. Use HH:mm (24-hour)");
  }

  if (!isValidTimeFormat(data.endTime)) {
    throw new Error("Invalid end time format. Use HH:mm (24-hour)");
  }

  // Validate tolerance range
  const tolerance = data.toleranceMinutes ?? 15;
  if (tolerance < 0 || tolerance > 120) {
    throw new Error("Tolerance must be between 0 and 120 minutes");
  }

  // Validate required staff count
  const requiredStaffCount = data.requiredStaffCount ?? 1;
  if (requiredStaffCount < 1 || requiredStaffCount > 20) {
    throw new Error("Required staff count must be between 1 and 20");
  }

  // Check for duplicate (jobType, shiftName)
  const existing = await prisma.shiftTemplate.findUnique({
    where: {
      jobType_shiftName: {
        jobType: data.jobType,
        shiftName: data.shiftName,
      },
    },
  });

  if (existing) {
    throw new Error(
      `Shift template "${data.shiftName}" already exists for ${data.jobType}`
    );
  }

  const template = await prisma.shiftTemplate.create({
    data: {
      jobType: data.jobType,
      shiftName: data.shiftName,
      startTime: data.startTime,
      endTime: data.endTime,
      toleranceMinutes: tolerance,
      requiredStaffCount,
    },
  });

  return template;
}

/**
 * Update a shift template
 */
export async function updateShiftTemplate(
  id: string,
  data: {
    shiftName?: string;
    startTime?: string;
    endTime?: string;
    toleranceMinutes?: number;
    requiredStaffCount?: number;
    isActive?: boolean;
  }
) {
  // Validate time formats if provided
  if (data.startTime && !isValidTimeFormat(data.startTime)) {
    throw new Error("Invalid start time format. Use HH:mm (24-hour)");
  }

  if (data.endTime && !isValidTimeFormat(data.endTime)) {
    throw new Error("Invalid end time format. Use HH:mm (24-hour)");
  }

  // Validate tolerance if provided
  if (data.toleranceMinutes !== undefined) {
    if (data.toleranceMinutes < 0 || data.toleranceMinutes > 120) {
      throw new Error("Tolerance must be between 0 and 120 minutes");
    }
  }

  // Validate required staff count if provided
  if (data.requiredStaffCount !== undefined) {
    if (data.requiredStaffCount < 1 || data.requiredStaffCount > 20) {
      throw new Error("Required staff count must be between 1 and 20");
    }
  }

  const template = await prisma.shiftTemplate.update({
    where: { id },
    data,
  });

  return template;
}

/**
 * Delete (soft delete) a shift template
 * Prevents deletion if future schedules exist
 */
export async function deleteShiftTemplate(id: string) {
  // Check for future schedules
  const futureSchedulesCount = await prisma.staffSchedule.count({
    where: {
      shiftTemplateId: id,
      date: {
        gte: new Date(),
      },
    },
  });

  if (futureSchedulesCount > 0) {
    throw new Error(
      `Cannot delete template. ${futureSchedulesCount} future schedule(s) exist.`
    );
  }

  // Soft delete (set isActive = false)
  const template = await prisma.shiftTemplate.update({
    where: { id },
    data: { isActive: false },
  });

  return template;
}
