import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAllUsers, createUser } from "@/services/user.service";

export const GET = auth(async (req) => {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") as "ADMIN" | "USER" | "STAFF" | null;

  const filters: any = {};
  if (role) {
    filters.role = role;
  }

  const users = await getAllUsers(filters);
  return NextResponse.json(users);
});

export const POST = auth(async (req) => {
  if (req.auth?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, role, houseId, staffJobType, phone } = await req.json();

  if (!name || !email || !role) {
    return NextResponse.json(
      { error: "Name, email, and role are required" },
      { status: 400 }
    );
  }

  try {
    const user = await createUser(name, email, role, undefined, houseId, staffJobType, phone);
    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create user" },
      { status: 400 }
    );
  }
});
