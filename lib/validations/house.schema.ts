import { z } from "zod";

export const houseFormSchema = z
  .object({
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
    isRented: z.boolean().optional().default(false),
    renterName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isRented && (!data.renterName || data.renterName.trim() === "")) {
        return false;
      }
      return true;
    },
    {
      message: "Renter name is required when house is marked as rented",
      path: ["renterName"],
    }
  );

export type HouseFormData = z.infer<typeof houseFormSchema>;
