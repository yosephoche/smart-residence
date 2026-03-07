import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import {
  getSubmissionById,
  reviewSubmission,
} from "@/services/submission.service";
import { reviewSubmissionSchema } from "@/lib/validations/submission.schema";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const isAdmin = session.user.role === "ADMIN";
    const submission = await getSubmissionById(
      id,
      isAdmin ? undefined : session.user.id,
      isAdmin
    );
    return NextResponse.json(serializePrismaJson({ submission }));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    const status = message === "Akses ditolak" ? 403 : 404;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = reviewSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  try {
    const submission = await reviewSubmission(
      id,
      session.user.id,
      parsed.data.status,
      parsed.data.adminNote
    );
    return NextResponse.json(
      serializePrismaJson({ message: "Status diperbarui", submission })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Terjadi kesalahan";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
