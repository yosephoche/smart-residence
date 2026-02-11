import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { approvePayment } from "@/services/payment.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const POST = auth(async (req, { params }) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const payment = await approvePayment(id, req.auth.user.id);
    return NextResponse.json(serializePrismaJson(payment));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to approve payment" },
      { status: 400 }
    );
  }
});
