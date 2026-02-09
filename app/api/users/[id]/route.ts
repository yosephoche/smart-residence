import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserById, updateUser, deleteUser } from "@/services/user.service";

export const GET = auth(async (_req, { params }) => {
  const { id } = await params;
  const user = await getUserById(id);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
});

export const PUT = auth(async (req, { params }) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const updates = await req.json();

  try {
    const user = await updateUser(id, updates);
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update user" },
      { status: 400 }
    );
  }
});

export const DELETE = auth(async (_req, { params }) => {
  if (_req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete user" },
      { status: 400 }
    );
  }
});
