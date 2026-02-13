import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getGeofenceConfig,
  setConfig,
} from "@/services/systemConfig.service";
import { revalidateGeofenceCache } from "@/lib/cache/geofence";
import { z } from "zod";

// Validation schema
const geofenceSchema = z.object({
  radiusMeters: z.number().int().min(1).max(1000),
  centerLat: z.number().min(-90).max(90),
  centerLon: z.number().min(-180).max(180),
});

/**
 * GET /api/system-config/geofence
 * Get geofence configuration (public - staff needs to read for validation errors)
 */
export async function GET() {
  try {
    const config = await getGeofenceConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching geofence config:", error);
    return NextResponse.json(
      { error: "Failed to fetch geofence configuration" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system-config/geofence
 * Update geofence configuration (admin only)
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
    const validation = geofenceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    await setConfig("geofence", validation.data, session.user.id);
    revalidateGeofenceCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating geofence config:", error);
    return NextResponse.json(
      { error: "Failed to update geofence configuration" },
      { status: 500 }
    );
  }
}
