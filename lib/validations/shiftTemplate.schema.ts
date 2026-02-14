import { z } from "zod";
import { JobType } from "@prisma/client";

const timeFormatRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

export const createShiftTemplateSchema = z.object({
  jobType: z.nativeEnum(JobType),
  shiftName: z.string().min(1, "Shift name is required").max(50),
  startTime: z
    .string()
    .regex(timeFormatRegex, "Invalid time format. Use HH:mm (24-hour)"),
  endTime: z
    .string()
    .regex(timeFormatRegex, "Invalid time format. Use HH:mm (24-hour)"),
  toleranceMinutes: z
    .number()
    .int()
    .min(0, "Tolerance must be at least 0")
    .max(120, "Tolerance must not exceed 120 minutes")
    .default(15),
  requiredStaffCount: z
    .number()
    .int()
    .min(1, "Required staff count must be at least 1")
    .max(20, "Required staff count must not exceed 20")
    .default(1),
});

export const updateShiftTemplateSchema = z.object({
  shiftName: z.string().min(1).max(50).optional(),
  startTime: z
    .string()
    .regex(timeFormatRegex, "Invalid time format. Use HH:mm (24-hour)")
    .optional(),
  endTime: z
    .string()
    .regex(timeFormatRegex, "Invalid time format. Use HH:mm (24-hour)")
    .optional(),
  toleranceMinutes: z
    .number()
    .int()
    .min(0)
    .max(120)
    .optional(),
  requiredStaffCount: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional(),
  isActive: z.boolean().optional(),
});

export type CreateShiftTemplateInput = z.infer<typeof createShiftTemplateSchema>;
export type UpdateShiftTemplateInput = z.infer<typeof updateShiftTemplateSchema>;
