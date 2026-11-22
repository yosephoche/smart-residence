import { z } from "zod";
import { JobType } from "@prisma/client";

export const createScheduleSchema = z.object({
  staffId: z.string().cuid("Invalid staff ID"),
  shiftTemplateId: z.string().cuid("Invalid shift template ID"),
  date: z.string().datetime("Invalid date format"),
  notes: z.string().max(500, "Notes must not exceed 500 characters").optional(),
});

export const bulkCreateScheduleSchema = z.object({
  staffId: z.string().cuid("Invalid staff ID"),
  shiftTemplateId: z.string().cuid("Invalid shift template ID"),
  startDate: z.string().datetime("Invalid start date format"),
  endDate: z.string().datetime("Invalid end date format"),
  notes: z.string().max(500, "Notes must not exceed 500 characters").optional(),
  isBulk: z.literal(true),
});

export const updateScheduleSchema = z.object({
  shiftTemplateId: z.string().cuid("Invalid shift template ID").optional(),
  notes: z.string().max(500, "Notes must not exceed 500 characters").optional(),
});

export const autoGenerateScheduleSchema = z.object({
  jobType: z.nativeEnum(JobType),
  startDate: z.string().datetime("Invalid start date format"),
  endDate: z.string().datetime("Invalid end date format"),
});

export const copyScheduleMonthPreviewSchema = z.object({
  sourceYear: z.number().int().min(2000).max(2100),
  sourceMonth: z.number().int().min(1).max(12),
  targetYear: z.number().int().min(2000).max(2100),
  targetMonth: z.number().int().min(1).max(12),
  jobType: z.nativeEnum(JobType).optional(),
});

export const copyScheduleMonthCommitSchema = z.object({
  operationId: z.string().cuid("Invalid operation ID"),
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type BulkCreateScheduleInput = z.infer<typeof bulkCreateScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type AutoGenerateScheduleInput = z.infer<typeof autoGenerateScheduleSchema>;
export type CopyScheduleMonthPreviewInput = z.infer<typeof copyScheduleMonthPreviewSchema>;
export type CopyScheduleMonthCommitInput = z.infer<typeof copyScheduleMonthCommitSchema>;
