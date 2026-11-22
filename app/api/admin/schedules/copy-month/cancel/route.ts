import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import * as scheduleService from "@/services/staffSchedule.service";
import { copyScheduleMonthCommitSchema } from "@/lib/validations/schedule.schema";

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

    const validation = copyScheduleMonthCommitSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const operation = await scheduleService.copyScheduleCancel(validation.data.operationId);

    return NextResponse.json({ operation }, { status: 200 });
  } catch (error: any) {
    console.error("Error cancelling schedule copy:", error);

    if (error.message.includes("tidak ditemukan")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to cancel schedule copy" },
      { status: 500 }
    );
  }
}
