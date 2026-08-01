import { NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { rejectPayment } from "@/services/payment.service";
import { dispatchPaymentDecided } from "@/lib/notifications";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const POST = auth(async (req, { params }) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const { rejectionNote } = await req.json();

  if (!rejectionNote) {
    return NextResponse.json(
      { error: "Rejection note is required" },
      { status: 400 }
    );
  }

  try {
    const payment = await rejectPayment(id, rejectionNote);

    // Keep the bot notification in sync so no admin acts on it twice.
    const adminName = req.auth?.user?.name ?? "admin";
    after(() => dispatchPaymentDecided(id, adminName, "REJECTED", rejectionNote));

    return NextResponse.json(serializePrismaJson(payment));
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to reject payment" },
      { status: 400 }
    );
  }
});
