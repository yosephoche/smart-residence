import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getCachedDefaultPasswordConfig } from "@/lib/cache/default-password";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

export const POST = auth(async (req, { params }) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { defaultPassword } = await getCachedDefaultPasswordConfig();
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword, isFirstLogin: true },
  });

  return NextResponse.json(serializePrismaJson({ success: true }));
});
