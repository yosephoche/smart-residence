import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllAttendanceEnhanced } from "@/services/attendance.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { JobType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only ADMIN can view all attendance
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId") || undefined;
    const jobType = searchParams.get("jobType") as JobType | undefined;
    const lateOnly = searchParams.get("lateOnly") === "true";
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;

    const attendances = await getAllAttendanceEnhanced({
      staffId,
      jobType,
      startDate,
      endDate,
      lateOnly,
    });

    return NextResponse.json({
      attendances: serializePrismaJson(attendances),
    });
  } catch (error: any) {
    console.error("[Get All Attendance Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to get attendance records" },
      { status: 500 }
    );
  }
}
