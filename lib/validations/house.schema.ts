import { z } from "zod";

export const houseFormSchema = z.object({
  houseNumber: z
    .string()
    .min(1, "House number is required")
    .max(50, "House number is too long"),
  block: z
    .string()
    .min(1, "Block is required")
    .max(50, "Block name is too long"),
  houseTypeId: z.string().min(1, "Please select a house type"),
  userId: z.string().optional(),
});

export type HouseFormData = z.infer<typeof houseFormSchema>;
