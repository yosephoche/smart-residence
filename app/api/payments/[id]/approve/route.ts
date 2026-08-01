import { NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { approvePayment } from "@/services/payment.service";
import { dispatchPaymentDecided } from "@/lib/notifications";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const POST = auth(async (req, { params }) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const payment = await approvePayment(id, req.auth.user.id);

    // Keep the bot notification in sync so no admin acts on it twice.
    const adminName = req.auth.user.name ?? "admin";
    after(() => dispatchPaymentDecided(id, adminName, "APPROVED"));

    return NextResponse.json(serializePrismaJson(payment));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to approve payment" },
      { status: 400 }
    );
  }
});
