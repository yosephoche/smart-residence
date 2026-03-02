import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllLeaves } from "@/services/leaveRequest.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { LeaveStatus } from "@prisma/client";

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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const leaves = await getAllLeaves({
      status: statusParam ? (statusParam as LeaveStatus) : undefined,
      staffId,
      startDate: startDateParam ? new Date(startDateParam) : undefined,
      endDate: endDateParam ? new Date(endDateParam) : undefined,
    });

    return NextResponse.json({ leaves: serializePrismaJson(leaves) });
  } catch (error: any) {
    console.error("[Admin Staff Leave GET]", error);
    return NextResponse.json({ error: "Failed to fetch leaves" }, { status: 500 });
  }
}
