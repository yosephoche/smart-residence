import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import {
  getUploadWindowConfig,
  setConfig,
} from "@/services/systemConfig.service";
import {
  getCachedUploadWindowConfig,
  revalidateUploadWindowCache,
} from "@/lib/cache/upload-window";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// Validation schema for upload window configuration
const uploadWindowSchema = z.object({
  enabled: z.boolean(),
  startDay: z.number().int().min(1).max(31),
  endDay: z.number().int().min(1).max(31),
}).refine(
  (data) => data.startDay <= data.endDay,
  {
    message: "startDay must be less than or equal to endDay",
    path: ["endDay"],
  }
);

/**
 * GET /api/system-config/upload-window
 * Fetch upload window configuration (public - authenticated users only)
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await getCachedUploadWindowConfig();
    return NextResponse.json(serializePrismaJson(config));
  } catch (error) {
    console.error("Error fetching upload window config:", error);
    return NextResponse.json(
      { error: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system-config/upload-window
 * Update upload window configuration (admin-only)
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Validate request body
    const validationResult = uploadWindowSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const config = validationResult.data;

    // Save configuration to database
    await setConfig("upload_window", config, session.user.id);

    // Invalidate cache to ensure immediate effect
    revalidateUploadWindowCache();

    return NextResponse.json(
      serializePrismaJson({
        success: true,
        message: "Configuration updated successfully",
        config,
      })
    );
  } catch (error) {
    console.error("Error updating upload window config:", error);
    return NextResponse.json(
      { error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
