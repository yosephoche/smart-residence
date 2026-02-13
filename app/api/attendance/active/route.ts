import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveShift } from "@/services/attendance.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only STAFF can check active shift
    if (session.user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Forbidden - Only staff members can check active shifts" },
        { status: 403 }
      );
    }

    const activeShift = await getActiveShift(session.user.id);

    return NextResponse.json({
      activeShift: serializePrismaJson(activeShift),
    });
  } catch (error: any) {
    console.error("[Get Active Shift Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to get active shift" },
      { status: 500 }
    );
  }
}
