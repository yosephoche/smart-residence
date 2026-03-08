import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { bulkCreatePayments } from "@/services/payment.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import { validateUploadedFile, saveUploadedFile } from "@/lib/utils/file-upload";

export const POST = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = req.auth.user.id;
  if (!adminId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const houseIdsRaw = formData.get("houseIds");
  const monthsRaw = formData.get("months");
  const file = formData.get("proof") as File | null;

  if (!houseIdsRaw || !monthsRaw) {
    return NextResponse.json(
      { error: "houseIds and months are required" },
      { status: 400 }
    );
  }

  let houseIds: string[];
  let months: { year: number; month: number }[];

  try {
    houseIds = JSON.parse(houseIdsRaw as string);
    months = JSON.parse(monthsRaw as string);
  } catch {
    return NextResponse.json({ error: "Invalid JSON in houseIds or months" }, { status: 400 });
  }

  if (!Array.isArray(houseIds) || houseIds.length === 0) {
    return NextResponse.json(
      { error: "houseIds must be a non-empty array" },
      { status: 400 }
    );
  }

  if (!Array.isArray(months) || months.length === 0) {
    return NextResponse.json(
      { error: "months must be a non-empty array" },
      { status: 400 }
    );
  }

  // Validate each month entry
  for (const m of months) {
    if (
      typeof m.year !== "number" || typeof m.month !== "number" ||
      m.month < 1 || m.month > 12 ||
      m.year < 2000 || m.year > 2100
    ) {
      return NextResponse.json(
        { error: "Each month entry must have a valid year (2000-2100) and month (1-12)" },
        { status: 400 }
      );
    }
  }

  // Handle optional proof image
  let proofImagePath: string | null = null;
  if (file && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await validateUploadedFile(buffer, file.type);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    proofImagePath = await saveUploadedFile(buffer, file.name);
  }

  try {
    const result = await bulkCreatePayments(houseIds, months, adminId, proofImagePath);
    return NextResponse.json(serializePrismaJson(result), { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to bulk create payments" },
      { status: 500 }
    );
  }
});
