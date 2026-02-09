import { z } from "zod";
import { MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/constants";

export const paymentUploadSchema = z.object({
  amountMonths: z
    .number({ required_error: "Please select number of months" })
    .min(1, "Minimum 1 month")
    .max(12, "Maximum 12 months"),
  proofImage: z
    .instanceof(File, { message: "Please upload payment proof" })
    .refine((file) => file.size <= MAX_FILE_SIZE, {
      message: "File size must be less than 2MB",
    })
    .refine((file) => ALLOWED_IMAGE_TYPES.includes(file.type), {
      message: "Only JPG, JPEG, and PNG files are allowed",
    }),
});

export type PaymentUploadFormData = z.infer<typeof paymentUploadSchema>;
