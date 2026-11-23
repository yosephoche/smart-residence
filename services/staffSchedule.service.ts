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

  // Annotate each schedule with isOnLeave flag
  if (schedules.length === 0) return schedules.map((s) => ({ ...s, isOnLeave: false }));

  const staffIds = [...new Set(schedules.map((s) => s.staffId))];
  const rangeStart = filters?.startDate ? normalizeDate(filters.startDate) : schedules[0].date;
  const rangeEnd = filters?.endDate
    ? normalizeDate(filters.endDate)
    : schedules[schedules.length - 1].date;

  const approvedLeaves = await prisma.staffLeave.findMany({
    where: {
      staffId: { in: staffIds },
      status: "APPROVED",
      startDate: { lte: rangeEnd },
      endDate: { gte: rangeStart },
    },
    select: { staffId: true, startDate: true, endDate: true },
  });

  // Build lookup: staffId -> [{start, end}]
  const leaveMap = new Map<string, { start: Date; end: Date }[]>();
  for (const leave of approvedLeaves) {
    if (!leaveMap.has(leave.staffId)) leaveMap.set(leave.staffId, []);
    leaveMap.get(leave.staffId)!.push({ start: leave.startDate, end: leave.endDate });
  }

  return schedules.map((s) => {
    const leaves = leaveMap.get(s.staffId) ?? [];
    const scheduleDate = normalizeDate(s.date);
    const isOnLeave = leaves.some(
      (l) => scheduleDate >= normalizeDate(l.start) && scheduleDate <= normalizeDate(l.end)
    );
    return { ...s, isOnLeave };
  });
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
  // Normalize to UTC midnight — consistent with how admin-created dates are stored
  const normalizedDate = new Date(date);
  normalizedDate.setUTCHours(0, 0, 0, 0);

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

// ---------------------------------------------------------------------------
// Copy-month-to-next-month (preview → commit)
// ---------------------------------------------------------------------------

const PREVIEW_TTL_MS = 48 * 60 * 60 * 1000; // preview goes STALE after 48h

export interface WeeklyPatternEntry {
  dayOfWeek: number; // 0 (Sun) .. 6 (Sat)
  staffId: string;
  shiftTemplateId: string;
}

export type CopyPlanAction = "CREATE" | "UPDATE" | "SKIP_LEAVE" | "SKIP_TEMPLATE_UNAVAILABLE";

export interface CopyPlanEntry {
  action: CopyPlanAction;
  staffId: string;
  shiftTemplateId: string;
  date: string; // ISO
  existingScheduleId?: string;
  previousShiftTemplateId?: string;
}

export interface CopyPlanSummary {
  created: number;
  overwritten: number;
  emptySlotLeave: number;
  skippedTemplateUnavailable: number;
  understaffedWarnings: {
    date: string;
    shiftTemplateId: string;
    shiftName: string;
    required: number;
    filled: number;
  }[];
}

/**
 * Extract a per-day-of-week staffing pattern from an already-built month.
 * When a weekday's assignments are inconsistent across weeks (e.g. someone
 * swapped a single Monday), the earliest occurrence of that weekday in the
 * month wins as the canonical pattern — kept generic (source is just a date
 * range) so a future "upload a week as a template" feature can reuse
 * applyWeeklyPattern() without depending on this extraction.
 */
export async function extractWeeklyPattern(
  sourceYear: number,
  sourceMonth: number,
  jobType?: JobType
): Promise<WeeklyPatternEntry[]> {
  const monthStart = normalizeDate(new Date(sourceYear, sourceMonth - 1, 1));
  const monthEnd = normalizeDate(new Date(sourceYear, sourceMonth, 0));

  const schedules = await prisma.staffSchedule.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      ...(jobType ? { shiftTemplate: { jobType } } : {}),
    },
    select: { staffId: true, shiftTemplateId: true, date: true },
    orderBy: { date: "asc" },
  });

  const earliestDateByWeekday = new Map<number, number>();
  for (const s of schedules) {
    const d = normalizeDate(s.date);
    const weekday = d.getDay();
    const t = d.getTime();
    if (!earliestDateByWeekday.has(weekday) || t < earliestDateByWeekday.get(weekday)!) {
      earliestDateByWeekday.set(weekday, t);
    }
  }

  const pattern: WeeklyPatternEntry[] = [];
  for (const s of schedules) {
    const d = normalizeDate(s.date);
    const weekday = d.getDay();
    if (d.getTime() === earliestDateByWeekday.get(weekday)) {
      pattern.push({ dayOfWeek: weekday, staffId: s.staffId, shiftTemplateId: s.shiftTemplateId });
    }
  }

  return pattern;
}

/**
 * Apply a weekly pattern to every matching weekday in a target month,
 * re-checking leave, shift-template availability and existing destination
 * data against the live DB. Overwrites are resolved by (staffId, date) —
 * not the [staffId, shiftTemplateId, date] unique key — so a destination
 * slot that already has a *different* shift gets its existing row updated
 * in place (same id) rather than deleted and recreated. StaffSchedule rows
 * are the parent of Attendance.scheduleId (onDelete: SetNull), so deleting
 * and recreating would silently orphan any attendance already recorded
 * against that schedule.
 */
export async function applyWeeklyPattern(
  pattern: WeeklyPatternEntry[],
  targetYear: number,
  targetMonth: number
): Promise<{ entries: CopyPlanEntry[]; summary: CopyPlanSummary }> {
  const monthStart = normalizeDate(new Date(targetYear, targetMonth - 1, 1));
  const monthEnd = normalizeDate(new Date(targetYear, targetMonth, 0));

  if (pattern.length === 0) {
    return {
      entries: [],
      summary: {
        created: 0,
        overwritten: 0,
        emptySlotLeave: 0,
        skippedTemplateUnavailable: 0,
        understaffedWarnings: [],
      },
    };
  }

  const dates: Date[] = [];
  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    dates.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  const staffIds = [...new Set(pattern.map((p) => p.staffId))];
  const shiftTemplateIds = [...new Set(pattern.map((p) => p.shiftTemplateId))];

  const [leaves, shiftTemplates, existingSchedules] = await Promise.all([
    prisma.staffLeave.findMany({
      where: {
        staffId: { in: staffIds },
        status: "APPROVED",
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: { staffId: true, startDate: true, endDate: true },
    }),
    prisma.shiftTemplate.findMany({ where: { id: { in: shiftTemplateIds } } }),
    prisma.staffSchedule.findMany({
      where: { staffId: { in: staffIds }, date: { gte: monthStart, lte: monthEnd } },
      select: { id: true, staffId: true, shiftTemplateId: true, date: true },
    }),
  ]);

  const shiftTemplateMap = new Map(shiftTemplates.map((t) => [t.id, t]));

  const leavesByStaff = new Map<string, { start: Date; end: Date }[]>();
  for (const l of leaves) {
    if (!leavesByStaff.has(l.staffId)) leavesByStaff.set(l.staffId, []);
    leavesByStaff
      .get(l.staffId)!
      .push({ start: normalizeDate(l.startDate), end: normalizeDate(l.endDate) });
  }

  const existingByStaffDate = new Map<string, { id: string; shiftTemplateId: string }>();
  for (const s of existingSchedules) {
    existingByStaffDate.set(`${s.staffId}|${normalizeDate(s.date).getTime()}`, {
      id: s.id,
      shiftTemplateId: s.shiftTemplateId,
    });
  }

  function isOnLeave(staffId: string, date: Date): boolean {
    const staffLeaves = leavesByStaff.get(staffId);
    if (!staffLeaves) return false;
    return staffLeaves.some((l) => date >= l.start && date <= l.end);
  }

  const entries: CopyPlanEntry[] = [];
  const filledCountByShift = new Map<string, number>();
  const totalCountByShift = new Map<string, number>();

  for (const date of dates) {
    const weekday = date.getDay();
    const dayEntries = pattern.filter((p) => p.dayOfWeek === weekday);

    for (const p of dayEntries) {
      const shiftKey = `${date.getTime()}|${p.shiftTemplateId}`;
      totalCountByShift.set(shiftKey, (totalCountByShift.get(shiftKey) ?? 0) + 1);

      const template = shiftTemplateMap.get(p.shiftTemplateId);
      if (!template || !template.isActive) {
        entries.push({
          action: "SKIP_TEMPLATE_UNAVAILABLE",
          staffId: p.staffId,
          shiftTemplateId: p.shiftTemplateId,
          date: date.toISOString(),
        });
        continue;
      }

      if (isOnLeave(p.staffId, date)) {
        entries.push({
          action: "SKIP_LEAVE",
          staffId: p.staffId,
          shiftTemplateId: p.shiftTemplateId,
          date: date.toISOString(),
        });
        continue;
      }

      filledCountByShift.set(shiftKey, (filledCountByShift.get(shiftKey) ?? 0) + 1);

      const existing = existingByStaffDate.get(`${p.staffId}|${date.getTime()}`);
      if (!existing) {
        entries.push({
          action: "CREATE",
          staffId: p.staffId,
          shiftTemplateId: p.shiftTemplateId,
          date: date.toISOString(),
        });
      } else {
        entries.push({
          action: "UPDATE",
          staffId: p.staffId,
          shiftTemplateId: p.shiftTemplateId,
          date: date.toISOString(),
          existingScheduleId: existing.id,
          previousShiftTemplateId: existing.shiftTemplateId,
        });
      }
    }
  }

  const understaffedWarnings: CopyPlanSummary["understaffedWarnings"] = [];
  for (const [shiftKey, total] of totalCountByShift) {
    const filled = filledCountByShift.get(shiftKey) ?? 0;
    if (filled < total) {
      const [dateMs, shiftTemplateId] = shiftKey.split("|");
      const template = shiftTemplateMap.get(shiftTemplateId);
      if (template && filled < template.requiredStaffCount) {
        understaffedWarnings.push({
          date: new Date(Number(dateMs)).toISOString(),
          shiftTemplateId,
          shiftName: template.shiftName,
          required: template.requiredStaffCount,
          filled,
        });
      }
    }
  }

  const summary: CopyPlanSummary = {
    created: entries.filter((e) => e.action === "CREATE").length,
    overwritten: entries.filter((e) => e.action === "UPDATE").length,
    emptySlotLeave: entries.filter((e) => e.action === "SKIP_LEAVE").length,
    skippedTemplateUnavailable: entries.filter((e) => e.action === "SKIP_TEMPLATE_UNAVAILABLE")
      .length,
    understaffedWarnings,
  };

  return { entries, summary };
}

function summariesMatch(a: CopyPlanSummary, b: CopyPlanSummary): boolean {
  return (
    a.created === b.created &&
    a.overwritten === b.overwritten &&
    a.emptySlotLeave === b.emptySlotLeave &&
    a.skippedTemplateUnavailable === b.skippedTemplateUnavailable
  );
}

/**
 * Build a preview of copying one month's schedule pattern to another month.
 * Always full-month, always every jobType unless explicitly scoped. Nothing
 * is written to StaffSchedule here — only the ScheduleCopyOperation record.
 */
export async function copySchedulePreview(
  sourceYear: number,
  sourceMonth: number,
  targetYear: number,
  targetMonth: number,
  createdBy: string,
  jobType?: JobType
) {
  const creator = await prisma.user.findUnique({ where: { id: createdBy } });
  if (!creator) {
    throw new Error(`User with ID ${createdBy} not found`);
  }

  const pattern = await extractWeeklyPattern(sourceYear, sourceMonth, jobType);
  if (pattern.length === 0) {
    throw new Error("Tidak ada jadwal pada bulan sumber untuk dijadikan pola");
  }

  const { entries, summary } = await applyWeeklyPattern(pattern, targetYear, targetMonth);
  const expiresAt = new Date(Date.now() + PREVIEW_TTL_MS);

  const operation = await prisma.scheduleCopyOperation.create({
    data: {
      sourceYear,
      sourceMonth,
      targetYear,
      targetMonth,
      jobType: jobType ?? null,
      status: "PREVIEW",
      plan: { pattern, entries } as any,
      summary: summary as any,
      expiresAt,
      createdBy,
    },
  });

  return { operationId: operation.id, summary, entries, expiresAt };
}

export async function getScheduleCopyOperation(id: string) {
  return prisma.scheduleCopyOperation.findUnique({ where: { id } });
}

/**
 * Cancel a preview that hasn't been committed yet. A no-op status change on
 * anything already COMMITTED/CANCELLED is left to the caller to detect via
 * getScheduleCopyOperation first (idempotency for double taps).
 */
export async function copyScheduleCancel(id: string) {
  const operation = await prisma.scheduleCopyOperation.findUnique({ where: { id } });
  if (!operation) {
    throw new Error("Operasi copy jadwal tidak ditemukan");
  }

  if (operation.status === "COMMITTED" || operation.status === "CANCELLED") {
    return operation;
  }

  return prisma.scheduleCopyOperation.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
}

/**
 * Commit a previewed copy operation. Re-derives the plan against the live DB
 * (never trusts the snapshotted plan blindly) because approval — especially
 * via Telegram — can land long after the preview was generated, by which
 * time leave could have been approved, a shift template deleted/deactivated,
 * or the destination schedule edited manually. If the freshly computed plan
 * disagrees with what was previewed, the operation is marked STALE and
 * rejected instead of silently committing drifted data.
 *
 * Writes are upserts keyed on (staffId, date) — see applyWeeklyPattern for
 * why this must never be delete+recreate — and every overwritten row's
 * previous shiftTemplateId is snapshotted in the same transaction before
 * being replaced, so a bad copy can be manually reverted from the audit
 * trail even though there is no staging environment to rehearse this on.
 */
export async function copyScheduleCommit(id: string, approvedBy: string) {
  const approver = await prisma.user.findUnique({ where: { id: approvedBy } });
  if (!approver) {
    throw new Error(`User with ID ${approvedBy} not found`);
  }

  const operation = await prisma.scheduleCopyOperation.findUnique({ where: { id } });
  if (!operation) {
    throw new Error("Operasi copy jadwal tidak ditemukan");
  }

  if (operation.status === "COMMITTED") {
    return { alreadyCommitted: true as const, createdCount: 0, updatedCount: 0, operation };
  }
  if (operation.status === "CANCELLED") {
    throw new Error("Operasi ini sudah dibatalkan");
  }

  if (operation.expiresAt < new Date()) {
    await prisma.scheduleCopyOperation.update({
      where: { id },
      data: { status: "STALE" },
    });
    throw new Error("Preview ini sudah kedaluwarsa (lebih dari 48 jam). Buat preview baru.");
  }

  const storedPlan = operation.plan as unknown as {
    pattern: WeeklyPatternEntry[];
    entries: CopyPlanEntry[];
  };
  const storedSummary = operation.summary as unknown as CopyPlanSummary;

  const fresh = await applyWeeklyPattern(storedPlan.pattern, operation.targetYear, operation.targetMonth);

  if (!summariesMatch(fresh.summary, storedSummary)) {
    await prisma.scheduleCopyOperation.update({
      where: { id },
      data: {
        status: "STALE",
        summary: fresh.summary as any,
        plan: { pattern: storedPlan.pattern, entries: fresh.entries } as any,
      },
    });
    throw new Error(
      "Data berubah sejak preview dibuat (ada cuti baru, jadwal diedit, atau shift template dihapus/nonaktif). Preview sudah diperbarui — tinjau ulang sebelum approve lagi."
    );
  }

  const toWrite = fresh.entries.filter((e) => e.action === "CREATE" || e.action === "UPDATE");

  // Reads happen before the transaction opens: Supabase's pooled DATABASE_URL
  // runs PgBouncer in transaction mode, which can reassign the underlying
  // connection between round-trips of a held interactive transaction and
  // invalidate it ("Transaction not found"). A single batch $transaction([...])
  // below sends all writes as one request instead, which PgBouncer handles.
  const snapshot: {
    scheduleId: string;
    staffId: string;
    date: string;
    previousShiftTemplateId: string;
  }[] = [];

  for (const entry of toWrite) {
    if (entry.action === "UPDATE" && entry.existingScheduleId) {
      const before = await prisma.staffSchedule.findUnique({ where: { id: entry.existingScheduleId } });
      if (before) {
        snapshot.push({
          scheduleId: before.id,
          staffId: before.staffId,
          date: before.date.toISOString(),
          previousShiftTemplateId: before.shiftTemplateId,
        });
      }
    }
  }

  let createdCount = 0;
  let updatedCount = 0;

  const writeOps = toWrite.map((entry) => {
    if (entry.action === "UPDATE" && entry.existingScheduleId) {
      updatedCount++;
      // Update in place (same row id) — never delete+recreate, or any
      // Attendance pointing at this schedule would be orphaned (SetNull).
      return prisma.staffSchedule.update({
        where: { id: entry.existingScheduleId },
        data: { shiftTemplateId: entry.shiftTemplateId, createdBy: approvedBy },
      });
    }
    createdCount++;
    return prisma.staffSchedule.create({
      data: {
        staffId: entry.staffId,
        shiftTemplateId: entry.shiftTemplateId,
        date: new Date(entry.date),
        createdBy: approvedBy,
      },
    });
  });

  const txResults = await prisma.$transaction([
    ...writeOps,
    prisma.scheduleCopyOperation.update({
      where: { id },
      data: {
        status: "COMMITTED",
        committedBy: approvedBy,
        committedAt: new Date(),
        snapshot: snapshot as any,
      },
    }),
  ]);
  const updatedOperation = txResults[txResults.length - 1];

  return { alreadyCommitted: false as const, createdCount, updatedCount, operation: updatedOperation as any };
}
