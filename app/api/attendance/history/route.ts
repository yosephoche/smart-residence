import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAttendanceHistory } from "@/services/attendance.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only STAFF can view their history
    if (session.user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Forbidden - Only staff members can view attendance history" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    const history = await getAttendanceHistory(session.user.id, limit);

    return NextResponse.json({
      history: serializePrismaJson(history),
    });
  } catch (error: any) {
    console.error("[Get Attendance History Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to get attendance history" },
      { status: 500 }
    );
  }
}
