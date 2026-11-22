import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllManualAttendanceRequests } from "@/services/manualAttendanceRequest.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { ManualAttendanceStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const staffId = searchParams.get("staffId") || undefined;

    const requests = await getAllManualAttendanceRequests({
      status: statusParam ? (statusParam as ManualAttendanceStatus) : undefined,
      staffId,
    });

    return NextResponse.json({ requests: serializePrismaJson(requests) });
  } catch (error: any) {
    console.error("[Admin Manual Attendance GET]", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
