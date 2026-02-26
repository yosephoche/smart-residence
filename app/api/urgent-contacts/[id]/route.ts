import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUrgentContactById,
  updateUrgentContact,
  deleteUrgentContact,
} from "@/services/urgentContact.service";

// PATCH /api/urgent-contacts/[id] - Admin only; partial update
export const PATCH = auth(async (req, { params }) => {
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden - Admin only" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const existing = await getUrgentContactById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, serviceType, phone, order, isActive } = body;

    const updateData: {
      name?: string;
      serviceType?: string;
      phone?: string;
      order?: number;
      isActive?: boolean;
    } = {};

    if (name !== undefined) updateData.name = String(name).trim();
    if (serviceType !== undefined)
      updateData.serviceType = String(serviceType).trim();
    if (order !== undefined) updateData.order = Number(order);
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (phone !== undefined) {
      const cleanPhone = String(phone).replace(/\D/g, "");
      if (!/^(62|0)\d{8,13}$/.test(cleanPhone)) {
        return NextResponse.json(
          {
            error:
              "Invalid phone number format. Use Indonesian format (e.g. 08123456789 or 628123456789)",
          },
          { status: 400 }
        );
      }
      updateData.phone = cleanPhone;
    }

    const updated = await updateUrgentContact(id, updateData);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating urgent contact:", error);
    return NextResponse.json(
      { error: "Failed to update urgent contact" },
      { status: 500 }
    );
  }
});

// DELETE /api/urgent-contacts/[id] - Admin only; hard delete
export const DELETE = auth(async (req, { params }) => {
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden - Admin only" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const existing = await getUrgentContactById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    await deleteUrgentContact(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting urgent contact:", error);
    return NextResponse.json(
      { error: "Failed to delete urgent contact" },
      { status: 500 }
    );
  }
});
