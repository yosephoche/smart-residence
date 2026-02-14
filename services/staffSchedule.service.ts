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

  // Get existing schedules to skip duplicates
  const existingSchedules = await prisma.staffSchedule.findMany({
    where: {
      staffId: { in: staff.map((s) => s.id) },
      date: {
        gte: normalizedStart,
        lte: normalizedEnd,
      },
    },
    select: { staffId: true, shiftTemplateId: true, date: true },
  });

  const existingKeys = new Set(
    existingSchedules.map(
      (s) => `${s.staffId}_${s.shiftTemplateId}_${s.date.toISOString()}`
    )
  );

  const schedulesToCreate: any[] = [];

  // Generate schedules with fair rotation
  dates.forEach((date, dateIndex) => {
    // Track which staff are already assigned for this date
    const assignedStaffForDate = new Set<string>();

    // Start rotation offset per date for fairness
    let rotationIndex = dateIndex * totalRequiredPerDay;

    shiftTemplates.forEach((shift) => {
      // Assign N staff to this shift based on requiredStaffCount
      let assignedCount = 0;
      let attempts = 0;
      const maxAttempts = staff.length * 2; // Prevent infinite loop

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

        // Assign this staff to this shift
        schedulesToCreate.push({
          staffId: staffMember.id,
          shiftTemplateId: shift.id,
          date,
          createdBy,
        });

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
