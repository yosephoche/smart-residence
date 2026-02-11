import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  getDefaultPasswordConfig,
  setConfig,
} from "@/services/systemConfig.service";
import { revalidateDefaultPasswordCache } from "@/lib/cache/default-password";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// Validation schema for default password configuration
const defaultPasswordSchema = z.object({
  defaultPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password too long"),
});

/**
 * GET /api/system-config/default-password
 * Get current default password configuration (Admin only)
 */
export const GET = auth(async (req) => {
  // Only admins can view default password config
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const config = await getDefaultPasswordConfig();
    return NextResponse.json(serializePrismaJson(config));
  } catch (error) {
    console.error("Error fetching default password config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
});

/**
 * POST /api/system-config/default-password
 * Update default password configuration (Admin only)
 */
export const POST = auth(async (req) => {
  // Only admins can modify default password config
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const validatedData = defaultPasswordSchema.parse(body);

    // Save configuration to database
    await setConfig(
      "default_password",
      validatedData,
      req.auth.user.id as string
    );

    // Invalidate cache so next user creation uses new password
    revalidateDefaultPasswordCache();

    return NextResponse.json(
      serializePrismaJson({
        success: true,
        config: validatedData,
      })
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Error updating default password config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
});
