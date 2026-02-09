import { z } from "zod";

export const userFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "USER"], {
    required_error: "Please select a role",
  }),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
});

export type UserFormData = z.infer<typeof userFormSchema>;
