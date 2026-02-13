import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createShiftReport,
  getShiftReports,
  getAllShiftReports,
} from "@/services/shiftReport.service";
import { validateUploadedFile, saveUploadedFile } from "@/lib/utils/file-upload";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { ShiftReportType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only STAFF can submit reports
    if (session.user.role !== "STAFF") {
      return NextResponse.json(
        { error: "Forbidden - Only staff members can submit reports" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const reportType = formData.get("reportType") as ShiftReportType;
    const content = formData.get("content") as string;
    const photo = formData.get("photo") as File | null;

    // Validate required fields
    if (!reportType || !content) {
      return NextResponse.json(
        { error: "Missing required fields: reportType, content" },
        { status: 400 }
      );
    }

    // Validate report type
    const validReportTypes: ShiftReportType[] = [
      "SHIFT_START",
      "SHIFT_MIDDLE",
      "SHIFT_END",
    ];
    if (!validReportTypes.includes(reportType)) {
      return NextResponse.json(
        { error: "Invalid reportType. Must be SHIFT_START, SHIFT_MIDDLE, or SHIFT_END" },
        { status: 400 }
      );
    }

    // Validate content length
    if (content.length < 10) {
      return NextResponse.json(
        { error: "Report content must be at least 10 characters" },
        { status: 400 }
      );
    }

    let photoUrl: string | undefined;

    // If photo provided, validate and save
    if (photo && photo.size > 0) {
      const buffer = Buffer.from(await photo.arrayBuffer());
      const validation = await validateUploadedFile(buffer, photo.type);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
      photoUrl = await saveUploadedFile(buffer, photo.name, "smartresidence/shift-reports");
    }

    // Create shift report
    const report = await createShiftReport(
      session.user.id,
      reportType,
      content,
      photoUrl
    );

    return NextResponse.json(
      {
        message: "Shift report submitted successfully",
        report: serializePrismaJson(report),
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Create Shift Report Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit shift report" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // STAFF sees own reports, ADMIN sees all reports with filters
    if (session.user.role === "STAFF") {
      const limit = parseInt(searchParams.get("limit") || "20", 10);
      const reports = await getShiftReports(session.user.id, limit);

      return NextResponse.json({
        reports: serializePrismaJson(reports),
      });
    } else if (session.user.role === "ADMIN") {
      const staffId = searchParams.get("staffId") || undefined;
      const reportType = (searchParams.get("reportType") as ShiftReportType) || undefined;
      const startDate = searchParams.get("startDate")
        ? new Date(searchParams.get("startDate")!)
        : undefined;
      const endDate = searchParams.get("endDate")
        ? new Date(searchParams.get("endDate")!)
        : undefined;

      const reports = await getAllShiftReports({
        staffId,
        reportType,
        startDate,
        endDate,
      });

      return NextResponse.json({
        reports: serializePrismaJson(reports),
      });
    } else {
      return NextResponse.json(
        { error: "Forbidden - Staff or Admin access required" },
        { status: 403 }
      );
    }
  } catch (error: any) {
    console.error("[Get Shift Reports Error]", error);
    return NextResponse.json(
      { error: error.message || "Failed to get shift reports" },
      { status: 500 }
    );
  }
}
