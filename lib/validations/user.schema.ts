import { z } from "zod";

export const userFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name too long"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["ADMIN", "USER"], {
    required_error: "Please select a role",
  }),
  houseId: z.string().optional(), // Optional house assignment during user creation
});

export type UserFormData = z.infer<typeof userFormSchema>;
