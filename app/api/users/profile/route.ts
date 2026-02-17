import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";

// GET /api/users/profile - Get current user's profile
export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
        houses: {
          include: {
            houseType: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(serializePrismaJson(user));
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
});

// PATCH /api/users/profile - Update current user's profile (phone, address)
export const PATCH = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    const body = await req.json();
    const { phone, address } = body;

    // Validation
    if (phone !== undefined && phone !== null) {
      if (typeof phone !== "string" || phone.length > 20) {
        return NextResponse.json(
          { error: "Phone number must be a string (max 20 characters)" },
          { status: 400 }
        );
      }

      // Optional: validate phone format (Indonesia format)
      if (phone && !/^(\+62|62|0)[0-9]{9,12}$/.test(phone.replace(/[\s-]/g, ""))) {
        return NextResponse.json(
          { error: "Invalid phone number format (use Indonesia format: +62/62/08)" },
          { status: 400 }
        );
      }
    }

    if (address !== undefined && address !== null) {
      if (typeof address !== "string" || address.length > 500) {
        return NextResponse.json(
          { error: "Address must be a string (max 500 characters)" },
          { status: 400 }
        );
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
      },
    });

    return NextResponse.json(serializePrismaJson(updatedUser));
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update user profile" },
      { status: 500 }
    );
  }
});
