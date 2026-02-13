import { z } from "zod";

export const userFormSchema = z
  .object({
    name: z.string().min(3, "Name must be at least 3 characters").max(100, "Name too long"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["ADMIN", "USER", "STAFF"], {
      required_error: "Please select a role",
    }),
    staffJobType: z.enum(["SECURITY", "CLEANING", "GARDENING", "MAINTENANCE", "OTHER"]).optional(),
    houseId: z.string().optional(), // Optional house assignment during user creation
  })
  .refine(
    (data) => {
      // If role is STAFF, staffJobType is required
      if (data.role === "STAFF") {
        return !!data.staffJobType;
      }
      return true;
    },
    {
      message: "Job type is required for staff members",
      path: ["staffJobType"],
    }
  )
  .refine(
    (data) => {
      // If role is not STAFF, staffJobType should not be set
      if (data.role !== "STAFF" && data.staffJobType) {
        return false;
      }
      return true;
    },
    {
      message: "Job type can only be set for staff members",
      path: ["staffJobType"],
    }
  );

export type UserFormData = z.infer<typeof userFormSchema>;
