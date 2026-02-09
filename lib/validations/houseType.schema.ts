import { z } from "zod";

export const houseTypeFormSchema = z.object({
  typeName: z
    .string()
    .min(3, "Type name must be at least 3 characters")
    .max(50, "Type name too long"),
  price: z
    .number({ invalid_type_error: "Price must be a number" })
    .positive("Price must be greater than 0")
    .max(100000000, "Price too high"),
  description: z.string().max(200, "Description too long").optional(),
});

export type HouseTypeFormData = z.infer<typeof houseTypeFormSchema>;
