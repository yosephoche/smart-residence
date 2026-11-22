import { z } from "zod";

export const createManualAttendanceRequestSchema = z
  .object({
    date: z.string().datetime({ message: "date harus berformat ISO datetime" }),
    clockInAt: z.string().datetime({ message: "clockInAt harus berformat ISO datetime" }),
    clockOutAt: z.string().datetime({ message: "clockOutAt harus berformat ISO datetime" }),
    reason: z
      .string()
      .min(10, "Alasan minimal 10 karakter")
      .max(500, "Alasan maksimal 500 karakter"),
  })
  .refine((data) => new Date(data.clockOutAt) > new Date(data.clockInAt), {
    message: "Jam keluar harus setelah jam masuk",
    path: ["clockOutAt"],
  });

export const reviewManualAttendanceRequestSchema = z.object({
  action: z.enum(["approve", "reject"], {
    required_error: "Action harus 'approve' atau 'reject'",
  }),
  rejectionNote: z.string().max(500).optional(),
});

export type CreateManualAttendanceRequestInput = z.infer<
  typeof createManualAttendanceRequestSchema
>;
export type ReviewManualAttendanceRequestInput = z.infer<
  typeof reviewManualAttendanceRequestSchema
>;
