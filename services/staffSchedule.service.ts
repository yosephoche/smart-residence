import { prisma } from "@/lib/prisma";
import { JobType, Role } from "@prisma/client";

/**
 * Normalize date to start of day (00:00:00)
 */
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Get schedules with filters
 */
export async function getSchedules(filters?: {
  staffId?: string;
  shiftTemplateId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const where: any = {};

  if (filters?.staffId) {
    where.staffId = filters.staffId;
  }

  if (filters?.shiftTemplateId) {
    where.shiftTemplateId = filters.shiftTemplateId;
  }

  if (filters?.startDate || filters?.endDate) {
    where.date = {};
    if (filters.startDate) {
      where.date.gte = normalizeDate(filters.startDate);
    }
    if (filters.endDate) {
      where.date.lte = normalizeDate(filters.endDate);
    }
  }

  const schedules = await prisma.staffSchedule.findMany({
    where,
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          email: true,
          staffJobType: true,
        },
      },
      shiftTemplate: true,
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { date: "asc" },
      { staff: { name: "asc" } },
    ],
  });

  return schedules;
}

/**
 * Get schedule by ID
 */
export async function getScheduleById(id: string) {
  const schedule = await prisma.staffSchedule.findUnique({
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
      shiftTemplate: true,
      creator: {
        select: {
          id: true,
          name: true,
        },
      },
      attendances: {
        orderBy: { clockInAt: "desc" },
        take: 1,
      },
    },
  });

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  return schedule;
}

/**
 * Get schedule for a staff member on a specific date
 */
export async function getScheduleForStaffOnDate(
  staffId: string,
  date: Date
) {
  const normalizedDate = normalizeDate(date);

  const schedule = await prisma.staffSchedule.findFirst({
    where: {
      staffId,
      date: normalizedDate,
    },
    include: {
      shiftTemplate: true,
    },
  });

  return schedule;
}

/**
 * Create a single schedule
 */
export async function createSchedule(
  staffId: string,
  shiftTemplateId: string,
  date: Date,
  createdBy: string,
  notes?: string
) {
  // Validate staff exists and has STAFF role
  const staff = await prisma.user.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new Error("Staff not found");
  }

  if (staff.role !== Role.STAFF) {
    throw new Error("User must have STAFF role");
  }

  // Validate that creator exists
  const creator = await prisma.user.findUnique({
    where: { id: createdBy },
  });

  if (!creator) {
    throw new Error(`User with ID ${createdBy} not found`);
  }

  // Validate shift template exists
  const shiftTemplate = await prisma.shiftTemplate.findUnique({
    where: { id: shiftTemplateId },
  });

  if (!shiftTemplate) {
    throw new Error("Shift template not found");
  }

  // Validate shift template matches staff job type
  if (staff.staffJobType !== shiftTemplate.jobType) {
    throw new Error(
      `Shift template job type (${shiftTemplate.jobType}) doesn't match staff job type (${staff.staffJobType})`
    );
  }

  const normalizedDate = normalizeDate(date);

  // Check for existing schedule on this date
  const existing = await prisma.staffSchedule.findFirst({
    where: {
      staffId,
      date: normalizedDate,
    },
  });

  if (existing) {
    throw new Error("Staff already has a schedule for this date");
  }

  const schedule = await prisma.staffSchedule.create({
    data: {
      staffId,
      shiftTemplateId,
      date: normalizedDate,
      notes,
      createdBy,
    },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          staffJobType: true,
        },
      },
      shiftTemplate: true,
    },
  });

  return schedule;
}

/**
 * Bulk create schedules for a staff member across a date range
 */
export async function bulkCreateSchedules(
  staffId: string,
  shiftTemplateId: string,
  startDate: Date,
  endDate: Date,
  createdBy: string,
  notes?: string
) {
  // Validate staff exists and has STAFF role
  const staff = await prisma.user.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new Error("Staff not found");
  }

  if (staff.role !== Role.STAFF) {
    throw new Error("User must have STAFF role");
  }

  // Validate that creator exists
  const creator = await prisma.user.findUnique({
    where: { id: createdBy },
  });

  if (!creator) {
    throw new Error(`User with ID ${createdBy} not found`);
  }

  // Validate shift template exists and matches job type
  const shiftTemplate = await prisma.shiftTemplate.findUnique({
    where: { id: shiftTemplateId },
  });

  if (!shiftTemplate) {
    throw new Error("Shift template not found");
  }

  if (staff.staffJobType !== shiftTemplate.jobType) {
    throw new Error(
      `Shift template job type doesn't match staff job type`
    );
  }

  // Generate dates
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);

  if (normalizedStart > normalizedEnd) {
    throw new Error("Start date must be before or equal to end date");
  }

  const dates: Date[] = [];
  const current = new Date(normalizedStart);

  while (current <= normalizedEnd) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // Get existing schedules for these dates
  const existingSchedules = await prisma.staffSchedule.findMany({
    where: {
      staffId,
      date: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
    },
    select: { date: true },
  });

  const existingDates = new Set(
    existingSchedules.map((s) => s.date.toISOString())
  );

  // Filter out dates that already have schedules
  const datesToCreate = dates.filter(
    (date) => !existingDates.has(date.toISOString())
  );

  // Bulk create schedules
  const schedules = await prisma.staffSchedule.createMany({
    data: datesToCreate.map((date) => ({
      staffId,
      shiftTemplateId,
      date,
      notes,
      createdBy,
    })),
    skipDuplicates: true,
  });

  return {
    created: schedules.count,
    skipped: dates.length - schedules.count,
    total: dates.length,
  };
}

/**
 * Auto-generate schedules for a job type across a date range
 * Distributes N staff per shift based on requiredStaffCount with fair rotation
 */
export async function autoGenerateSchedules(
  jobType: JobType,
  startDate: Date,
  endDate: Date,
  createdBy: string
) {
  const normalizedStart = normalizeDate(startDate);
  const normalizedEnd = normalizeDate(endDate);

  if (normalizedStart > normalizedEnd) {
    throw new Error("Start date must be before or equal to end date");
  }

  // Validate that creator exists
  const creator = await prisma.user.findUnique({
    where: { id: createdBy },
  });

  if (!creator) {
    throw new Error(`User with ID ${createdBy} not found`);
  }

  // Get all active staff of this job type
  const staff = await prisma.user.findMany({
    where: {
      role: Role.STAFF,
      staffJobType: jobType,
    },
    orderBy: { name: "asc" },
  });

  if (staff.length === 0) {
    throw new Error(`No staff found with job type ${jobType}`);
  }

  // Get active shift templates for this job type
  const shiftTemplates = await prisma.shiftTemplate.findMany({
    where: {
      jobType,
      isActive: true,
    },
    orderBy: { startTime: "asc" },
  });

  if (shiftTemplates.length === 0) {
    throw new Error(`No active shift templates found for ${jobType}`);
  }

  // Calculate total required staff per day and validate
  const totalRequiredPerDay = shiftTemplates.reduce(
    (sum, shift) => sum + shift.requiredStaffCount,
    0
  );

  if (totalRequiredPerDay > staff.length) {
    throw new Error(
      `Insufficient staff: ${totalRequiredPerDay} required per day (${shiftTemplates
        .map((s) => `${s.shiftName}: ${s.requiredStaffCount}`)
        .join(", ")}), only ${staff.length} available`
    );
  }

  if (totalRequiredPerDay === staff.length) {
    console.warn(
      `All ${staff.length} staff will be scheduled every day (no rotation possible)`
    );
  }

  // Generate dates
  const dates: Date[] = [];
  const current = new Date(normalizedStart);

  while (current <= normalizedEnd) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // Get existing schedules to skip duplicates (with 2-day lookback for consecutive-day constraint)
  const lookbackStart = new Date(normalizedStart);
  lookbackStart.setDate(lookbackStart.getDate() - 2);

  const existingSchedules = await prisma.staffSchedule.findMany({
    where: {
      staffId: { in: staff.map((s) => s.id) },
      date: {
        gte: lookbackStart,
        lte: normalizedEnd,
      },
    },
    select: { staffId: true, shiftTemplateId: true, date: true },
  });

  const existingKeys = new Set<string>();
  // staffId -> shiftTemplateId -> Set<dateString "YYYY-MM-DD">
  const staffShiftDates = new Map<string, Map<string, Set<string>>>();

  existingSchedules.forEach((s) => {
    const dateStr = s.date.toISOString().split("T")[0];
    // Only mark as duplicate-skip if within the actual generation range
    if (s.date >= normalizedStart && s.date <= normalizedEnd) {
      existingKeys.add(`${s.staffId}_${s.shiftTemplateId}_${s.date.toISOString()}`);
    }
    // Track for consecutive-day checks (includes lookback days)
    if (!staffShiftDates.has(s.staffId)) staffShiftDates.set(s.staffId, new Map());
    if (!staffShiftDates.get(s.staffId)!.has(s.shiftTemplateId))
      staffShiftDates.get(s.staffId)!.set(s.shiftTemplateId, new Set());
    staffShiftDates.get(s.staffId)!.get(s.shiftTemplateId)!.add(dateStr);
  });

  // Returns true if this staff has worked this same shift on BOTH
  // the day before and two days before `date` (i.e., 2 consecutive days already)
  function hasWorkedShiftTwoDaysBefore(staffId: string, shiftId: string, date: Date): boolean {
    const shiftDates = staffShiftDates.get(staffId)?.get(shiftId);
    if (!shiftDates || shiftDates.size < 2) return false;
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayBefore = new Date(date);
    dayBefore.setDate(dayBefore.getDate() - 2);
    return (
      shiftDates.has(yesterday.toISOString().split("T")[0]) &&
      shiftDates.has(dayBefore.toISOString().split("T")[0])
    );
  }

  const schedulesToCreate: any[] = [];

  // Generate schedules with fair rotation
  dates.forEach((date, dateIndex) => {
    // Track which staff are already assigned for this date
    const assignedStaffForDate = new Set<string>();

    // Advance by 1 per day for true rotation through all staff
    let rotationIndex = dateIndex;

    shiftTemplates.forEach((shift) => {
      // Assign N staff to this shift based on requiredStaffCount
      let assignedCount = 0;
      let attempts = 0;
      const maxAttempts = staff.length * 3; // extra headroom for consecutive-day skips

      while (assignedCount < shift.requiredStaffCount && attempts < maxAttempts) {
        const staffMember = staff[rotationIndex % staff.length];
        const key = `${staffMember.id}_${shift.id}_${date.toISOString()}`;

        attempts++;

        // Check if this exact schedule already exists
        if (existingKeys.has(key)) {
          rotationIndex++;
          continue;
        }

        // Check if this staff is already assigned for this date
        if (assignedStaffForDate.has(staffMember.id)) {
          rotationIndex++;
          continue;
        }

        // Skip if staff has already worked this shift for 2 consecutive days
        if (hasWorkedShiftTwoDaysBefore(staffMember.id, shift.id, date)) {
          rotationIndex++;
          continue;
        }

        // Assign this staff to this shift
        schedulesToCreate.push({
          staffId: staffMember.id,
          shiftTemplateId: shift.id,
          date,
          createdBy,
        });

        // Track for consecutive-day constraint
        const dateStr = date.toISOString().split("T")[0];
        if (!staffShiftDates.has(staffMember.id)) staffShiftDates.set(staffMember.id, new Map());
        if (!staffShiftDates.get(staffMember.id)!.has(shift.id))
          staffShiftDates.get(staffMember.id)!.set(shift.id, new Set());
        staffShiftDates.get(staffMember.id)!.get(shift.id)!.add(dateStr);

        assignedStaffForDate.add(staffMember.id);
        assignedCount++;
        rotationIndex++;
      }

      // Warn if we couldn't assign enough staff to this shift
      if (assignedCount < shift.requiredStaffCount) {
        console.warn(
          `Could only assign ${assignedCount}/${shift.requiredStaffCount} staff to ${shift.shiftName} on ${date.toISOString().split("T")[0]}`
        );
      }
    });
  });

  // Bulk create schedules
  const result = await prisma.staffSchedule.createMany({
    data: schedulesToCreate,
    skipDuplicates: true,
  });

  return {
    created: result.count,
    skipped: schedulesToCreate.length - result.count,
    dates: dates.length,
    staffCount: staff.length,
    shiftsPerDay: shiftTemplates.length,
    requiredPerDay: totalRequiredPerDay,
  };
}

/**
 * Update a schedule
 */
export async function updateSchedule(
  id: string,
  data: {
    shiftTemplateId?: string;
    notes?: string;
  }
) {
  // If changing shift template, validate it matches staff job type
  if (data.shiftTemplateId) {
    const schedule = await prisma.staffSchedule.findUnique({
      where: { id },
      include: {
        staff: true,
        shiftTemplate: true,
      },
    });

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    const newShiftTemplate = await prisma.shiftTemplate.findUnique({
      where: { id: data.shiftTemplateId },
    });

    if (!newShiftTemplate) {
      throw new Error("Shift template not found");
    }

    if (schedule.staff.staffJobType !== newShiftTemplate.jobType) {
      throw new Error(
        "New shift template job type doesn't match staff job type"
      );
    }
  }

  const schedule = await prisma.staffSchedule.update({
    where: { id },
    data,
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          staffJobType: true,
        },
      },
      shiftTemplate: true,
    },
  });

  return schedule;
}

/**
 * Bulk delete schedules
 * Skips any schedule that has attendance records
 * Returns { succeeded: string[], failed: { id: string, reason: string }[] }
 */
export async function bulkDeleteSchedules(ids: string[]) {
  const succeeded: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  // Check attendance for all IDs in one query
  const withAttendance = await prisma.attendance.findMany({
    where: { scheduleId: { in: ids } },
    select: { scheduleId: true },
  });

  const blockedIds = new Set(withAttendance.map((a) => a.scheduleId));

  const safeIds: string[] = [];
  for (const id of ids) {
    if (blockedIds.has(id)) {
      failed.push({ id, reason: "Cannot delete schedule. Attendance record exists." });
    } else {
      safeIds.push(id);
    }
  }

  if (safeIds.length > 0) {
    await prisma.staffSchedule.deleteMany({
      where: { id: { in: safeIds } },
    });
    succeeded.push(...safeIds);
  }

  return { succeeded, failed };
}

/**
 * Delete a schedule
 * Prevents deletion if attendance exists
 */
export async function deleteSchedule(id: string) {
  // Check for attendance
  const attendanceCount = await prisma.attendance.count({
    where: { scheduleId: id },
  });

  if (attendanceCount > 0) {
    throw new Error("Cannot delete schedule. Attendance record exists.");
  }

  await prisma.staffSchedule.delete({
    where: { id },
  });

  return { success: true };
}
