import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUrgentContacts,
  getAllUrgentContacts,
  createUrgentContact,
} from "@/services/urgentContact.service";

// GET /api/urgent-contacts - Auth required; admin gets all, user/staff gets active only
export const GET = auth(async (req) => {
  const session = req.auth;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contacts =
      session.user.role === "ADMIN"
        ? await getAllUrgentContacts()
        : await getUrgentContacts();

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Error fetching urgent contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch urgent contacts" },
      { status: 500 }
    );
  }
});

// POST /api/urgent-contacts - Admin only
export const POST = auth(async (req) => {
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
    const body = await req.json();
    const { name, serviceType, phone, order } = body;

    if (!name || !serviceType || !phone) {
      return NextResponse.json(
        { error: "Missing required fields: name, serviceType, phone" },
        { status: 400 }
      );
    }

    // Validate Indonesian phone number (after stripping non-digits)
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

    const contact = await createUrgentContact({
      name: String(name).trim(),
      serviceType: String(serviceType).trim(),
      phone: cleanPhone,
      order: typeof order === "number" ? order : 0,
      createdBy: session.user.id,
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Error creating urgent contact:", error);
    return NextResponse.json(
      { error: "Failed to create urgent contact" },
      { status: 500 }
    );
  }
});
