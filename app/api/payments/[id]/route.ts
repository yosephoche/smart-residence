import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentById } from "@/services/payment.service";

export const GET = auth(async (req, { params }) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const payment = await getPaymentById(id);

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // USER can only see own payments; ADMIN can see any
  if (session.user.role === "USER" && payment.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(payment);
});
