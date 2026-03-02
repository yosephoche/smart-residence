import { z } from "zod";

export const createLeaveRequestSchema = z.object({
  startDate: z.string().datetime({ message: "startDate harus berformat ISO datetime" }),
  endDate: z.string().datetime({ message: "endDate harus berformat ISO datetime" }),
  reason: z
    .string()
    .min(10, "Alasan minimal 10 karakter")
    .max(500, "Alasan maksimal 500 karakter"),
});

export const reviewLeaveRequestSchema = z.object({
  action: z.enum(["approve", "reject"], {
    required_error: "Action harus 'approve' atau 'reject'",
  }),
  rejectionNote: z.string().max(500).optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ReviewLeaveRequestInput = z.infer<typeof reviewLeaveRequestSchema>;
