import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createPayment } from "@/services/payment.service";
import { validateUploadedFile, saveUploadedFile } from "@/lib/utils/file-upload";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const POST = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const userId = formData.get("userId") as string;
  const houseId = formData.get("houseId") as string;
  const proofImage = formData.get("proofImage") as File;
  const monthsRaw = formData.get("months") as string | null;

  if (!userId || !houseId || !proofImage) {
    return NextResponse.json(
      { error: "userId, houseId, and proofImage are required" },
      { status: 400 }
    );
  }

  // Explicit month list (preferred); falls back to amountMonths auto-allocation
  let months: Array<{ year: number; month: number }> | undefined;
  if (monthsRaw) {
    try {
      months = JSON.parse(monthsRaw);
    } catch {
      return NextResponse.json({ error: "months must be valid JSON" }, { status: 400 });
    }
    if (!Array.isArray(months) || months.length < 1 || months.length > 12) {
      return NextResponse.json(
        { error: "months must be an array of 1-12 items" },
        { status: 400 }
      );
    }
    for (const m of months) {
      if (
        typeof m.year !== "number" || typeof m.month !== "number" ||
        m.month < 1 || m.month > 12 ||
        m.year < 2000 || m.year > 2100
      ) {
        return NextResponse.json(
          { error: "Each month must have a valid year (2000-2100) and month (1-12)" },
          { status: 400 }
        );
      }
    }
  }

  const amountMonths = months ? months.length : Number(formData.get("amountMonths"));

  if (!amountMonths || amountMonths < 1 || amountMonths > 12) {
    return NextResponse.json(
      { error: "amountMonths must be between 1 and 12" },
      { status: 400 }
    );
  }

  // Verify the house is actually assigned to the submitted userId
  const { prisma } = await import("@/lib/prisma");
  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house || house.userId !== userId) {
    return NextResponse.json(
      { error: "House does not belong to the specified user" },
      { status: 400 }
    );
  }

  // Validate uploaded file
  const buffer = Buffer.from(await proofImage.arrayBuffer());
  const validation = await validateUploadedFile(buffer, proofImage.type);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Save file
  const proofImagePath = await saveUploadedFile(buffer, proofImage.name);

  try {
    const payment = await createPayment(userId, houseId, amountMonths, proofImagePath, months);
    return NextResponse.json(serializePrismaJson(payment), { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create payment" },
      { status: 400 }
    );
  }
});
