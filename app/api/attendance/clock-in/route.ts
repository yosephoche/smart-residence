import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clockIn } from "@/services/attendance.service";
import { validateUploadedFile, saveUploadedFile } from "@/lib/utils/file-upload";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only STAFF can clock in
    if (session.user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Forbidden - Only staff members can clock in" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const shiftStartTime = formData.get("shiftStartTime") as string;
    const lat = parseFloat(formData.get("lat") as string);
    const lon = parseFloat(formData.get("lon") as string);
    const photo = formData.get("photo") as File;
    const scheduleId = formData.get("scheduleId") as string | null;

    // Validate required fields
    if (!shiftStartTime || isNaN(lat) || isNaN(lon) || !photo) {
      return NextResponse.json(
        { error: "Missing required fields: shiftStartTime, lat, lon, photo" },
        { status: 400 }
      );
    }

    // Validate shift start time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(shiftStartTime)) {
      return NextResponse.json(
        { error: "Invalid shiftStartTime format. Use HH:mm (e.g., 07:00)" },
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

    // Clock in
    const attendance = await clockIn(
      session.user.id,
      shiftStartTime,
      lat,
      lon,
      photoUrl,
      scheduleId || undefined
    );

    return NextResponse.json(
      {
        message: "Clocked in successfully",
        attendance: serializePrismaJson(attendance),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Clock In Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to clock in" },
      { status: 500 }
    );
  }
}
