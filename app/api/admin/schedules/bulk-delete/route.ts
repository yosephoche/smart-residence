import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { bulkDeleteSchedules } from "@/services/staffSchedule.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { scheduleIds } = body;

    if (!Array.isArray(scheduleIds) || scheduleIds.length === 0) {
      return NextResponse.json(
        { error: "scheduleIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const result = await bulkDeleteSchedules(scheduleIds);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error bulk deleting schedules:", error);
    return NextResponse.json(
      { error: error.message || "Failed to bulk delete schedules" },
      { status: 500 }
    );
  }
}
