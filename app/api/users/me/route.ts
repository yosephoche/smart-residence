import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateUser } from "@/services/user.service";

export const PATCH = auth(async (req) => {
  const userId = req.auth?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone } = await req.json();

  try {
    const user = await updateUser(userId, { phone: phone ?? null });
    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update profile" },
      { status: 400 }
    );
  }
});
