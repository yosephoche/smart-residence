import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentStats } from "@/services/payment.service";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const GET = auth(async (req) => {
  const stats = await getPaymentStats();
  return NextResponse.json(serializePrismaJson(stats));
});
