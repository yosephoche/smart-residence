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

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json(
        { error: "Date parameter is required" },
        { status: 400 }
      );
    }

    const date = new Date(dateParam);

    const schedule = await scheduleService.getScheduleForStaffOnDate(
      session.user.id,
      date
    );

    return NextResponse.json({ schedule });
  } catch (error: any) {
    console.error("Error fetching schedule:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch schedule" },
      { status: 500 }
    );
  }
}
