import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT /api/users/[id]/pengurus - Toggle isPengurus flag (admin only)
export const PUT = auth(async (req, { params }) => {
  const session = req.auth;
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { isPengurus } = body;

    if (typeof isPengurus !== "boolean") {
      return NextResponse.json({ error: "isPengurus must be a boolean" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isPengurus },
      select: { id: true, name: true, email: true, role: true, isPengurus: true },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
});
