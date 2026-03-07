import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serializePrismaJson } from "@/lib/utils/prisma-serializer";
import {
  getSubmissionsByUser,
  getAllSubmissions,
  createSubmission,
} from "@/services/submission.service";
import { createSubmissionSchema } from "@/lib/validations/submission.schema";
import { SubmissionStatus, SubmissionType } from "@prisma/client";

export const GET = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const type = (url.searchParams.get("type") as SubmissionType) ?? undefined;
  const status =
    (url.searchParams.get("status") as SubmissionStatus) ?? undefined;

  if (session.user.role === "ADMIN") {
    const userId = url.searchParams.get("userId") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const submissions = await getAllSubmissions({ type, status, userId, search });
    return NextResponse.json(serializePrismaJson({ submissions }));
  }

  const submissions = await getSubmissionsByUser(session.user.id, {
    type,
    status,
  });
  return NextResponse.json(serializePrismaJson({ submissions }));
});

export const POST = auth(async (req) => {
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "USER") {
    return NextResponse.json(
      { error: "Hanya penghuni yang dapat membuat pengaduan" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const submission = await createSubmission(
    session.user.id,
    parsed.data.type,
    parsed.data.title,
    parsed.data.content
  );

  return NextResponse.json(serializePrismaJson({ submission }), {
    status: 201,
  });
});
