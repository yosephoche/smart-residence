import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Role, JobType } from "@prisma/client";
import * as shiftTemplateService from "@/services/shiftTemplate.service";
import { createShiftTemplateSchema } from "@/lib/validations/shiftTemplate.schema";

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
    const jobType = searchParams.get("jobType") as JobType | null;
    const isActiveParam = searchParams.get("isActive");

    const filters: any = {};
    if (jobType) {
      filters.jobType = jobType;
    }
    if (isActiveParam !== null) {
      filters.isActive = isActiveParam === "true";
    }

    const templates = await shiftTemplateService.getAllShiftTemplates(filters);

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error("Error fetching shift templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch shift templates" },
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

    // Validate request body
    const validation = createShiftTemplateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const template = await shiftTemplateService.createShiftTemplate(
      validation.data
    );

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating shift template:", error);

    if (error.message.includes("already exists")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to create shift template" },
      { status: 500 }
    );
  }
}
