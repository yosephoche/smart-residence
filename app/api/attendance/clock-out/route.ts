import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clockOut } from "@/services/attendance.service";
import { validateUploadedFile, saveUploadedFile } from "@/lib/utils/file-upload";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only STAFF can clock out
    if (session.user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Forbidden - Only staff members can clock out" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const lat = parseFloat(formData.get("lat") as string);
    const lon = parseFloat(formData.get("lon") as string);
    const photo = formData.get("photo") as File;

    // Validate required fields
    if (isNaN(lat) || isNaN(lon) || !photo) {
      return NextResponse.json(
        { error: "Missing required fields: lat, lon, photo" },
        { status: 400 }
      );
    }

    // Validate photo file
    const buffer = Buffer.from(await photo.arrayBuffer());
    const validation = await validateUploadedFile(buffer, photo.type);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Save photo to storage
    const photoUrl = await saveUploadedFile(buffer, photo.name, "smartresidence/attendance");

    // Clock out
    const attendance = await clockOut(session.user.id, lat, lon, photoUrl);

    return NextResponse.json(
      {
        message: "Clocked out successfully",
        attendance: serializePrismaJson(attendance),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Clock Out Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to clock out" },
      { status: 500 }
    );
  }
}
