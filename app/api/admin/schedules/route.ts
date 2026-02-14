import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import * as scheduleService from "@/services/staffSchedule.service";
import {
  createScheduleSchema,
  bulkCreateScheduleSchema,
} from "@/lib/validations/schedule.schema";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    const shiftTemplateId = searchParams.get("shiftTemplateId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const filters: any = {};
    if (staffId) filters.staffId = staffId;
    if (shiftTemplateId) filters.shiftTemplateId = shiftTemplateId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const schedules = await scheduleService.getSchedules(filters);

    return NextResponse.json({ schedules });
  } catch (error: any) {
    console.error("Error fetching schedules:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

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

    // Check if bulk or single creation
    const isBulk = body.isBulk === true;

    if (isBulk) {
      // Validate bulk request
      const validation = bulkCreateScheduleSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const result = await scheduleService.bulkCreateSchedules(
        validation.data.staffId,
        validation.data.shiftTemplateId,
        new Date(validation.data.startDate),
        new Date(validation.data.endDate),
        session.user.id,
        validation.data.notes
      );

      return NextResponse.json({ result }, { status: 201 });
    } else {
      // Validate single request
      const validation = createScheduleSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const schedule = await scheduleService.createSchedule(
        validation.data.staffId,
        validation.data.shiftTemplateId,
        new Date(validation.data.date),
        session.user.id,
        validation.data.notes
      );

      return NextResponse.json({ schedule }, { status: 201 });
    }
  } catch (error: any) {
    console.error("Error creating schedule:", error);

    if (
      error.message.includes("already has a schedule") ||
      error.message.includes("Staff not found") ||
      error.message.includes("Shift template not found") ||
      error.message.includes("must have STAFF role")
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error.message.includes("doesn't match")) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to create schedule" },
      { status: 500 }
    );
  }
}
