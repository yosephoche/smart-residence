import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import * as scheduleService from "@/services/staffSchedule.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.STAFF) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dateParam = req.nextUrl.searchParams.get("date"); // "2026-02-28"
    // Use client-provided local date (parsed as UTC midnight) instead of server's new Date()
    const today = dateParam
      ? new Date(`${dateParam}T00:00:00.000Z`)
      : new Date();

    const schedule = await scheduleService.getScheduleForStaffOnDate(
      session.user.id,
      today
    );

    return NextResponse.json({ schedule });
  } catch (error: any) {
    console.error("Error fetching today's schedule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
