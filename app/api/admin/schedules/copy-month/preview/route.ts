import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import * as scheduleService from "@/services/staffSchedule.service";
import { copyScheduleMonthPreviewSchema } from "@/lib/validations/schedule.schema";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user?.id) {
      return NextResponse.json(
        { error: "Invalid session: user ID not found" },
        { status: 401 }
      );
    }

    const body = await req.json();

    const validation = copyScheduleMonthPreviewSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { sourceYear, sourceMonth, targetYear, targetMonth, jobType } = validation.data;

    const preview = await scheduleService.copySchedulePreview(
      sourceYear,
      sourceMonth,
      targetYear,
      targetMonth,
      session.user.id,
      jobType
    );

    return NextResponse.json({ preview }, { status: 201 });
  } catch (error: any) {
    console.error("Error previewing schedule copy:", error);

    if (
      error.message.includes("Tidak ada jadwal") ||
      error.message.includes("User with ID") ||
      error.message.includes("not found")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to preview schedule copy" },
      { status: 500 }
    );
  }
}
