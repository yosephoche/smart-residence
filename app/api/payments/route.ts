import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPayments, createPayment } from "@/services/payment.service";
import { validateUploadedFile, saveUploadedFile } from "@/lib/utils/file-upload";
import { getCachedUploadWindowConfig } from "@/lib/cache/upload-window";
import { isWithinUploadWindow } from "@/services/systemConfig.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;

  // USER sees only their own payments; ADMIN sees all
  const userId = session.user.role === "USER" ? session.user.id : (url.searchParams.get("userId") ?? undefined);

  const payments = await getPayments({ status, userId });
  return NextResponse.json(serializePrismaJson(payments));
});

export const POST = auth(async (req) => {
  const session = req.auth;
  if (!session?.user || session.user.role !== "USER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check upload window restriction
  const uploadConfig = await getCachedUploadWindowConfig();
  const windowCheck = isWithinUploadWindow(uploadConfig);
  if (!windowCheck.allowed) {
    return NextResponse.json(
      { error: windowCheck.message },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const amountMonths = Number(formData.get("amountMonths"));
  const proofImage = formData.get("proofImage") as File;
  const houseId = formData.get("houseId") as string;

  if (!amountMonths || !proofImage || !houseId) {
    return NextResponse.json(
      { error: "amountMonths, proofImage, and houseId are required" },
      { status: 400 }
    );
  }

  if (amountMonths < 1 || amountMonths > 12) {
    return NextResponse.json(
      { error: "amountMonths must be between 1 and 12" },
      { status: 400 }
    );
  }

  // Verify house belongs to this user
  const { prisma } = await import("@/lib/prisma");
  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house || house.userId !== session.user.id) {
    return NextResponse.json(
      { error: "House does not belong to you" },
      { status: 403 }
    );
  }

  // Validate the uploaded file
  const buffer = Buffer.from(await proofImage.arrayBuffer());
  const validation = await validateUploadedFile(buffer, proofImage.type);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  // Save the file
  const proofImagePath = await saveUploadedFile(buffer, proofImage.name);

  try {
    const payment = await createPayment(
      session.user.id,
      houseId,
      amountMonths,
      proofImagePath
    );
    return NextResponse.json(serializePrismaJson(payment), { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create payment" },
      { status: 400 }
    );
  }
});
