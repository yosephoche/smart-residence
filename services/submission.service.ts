import { prisma } from "@/lib/prisma";
import { SubmissionStatus, SubmissionType } from "@prisma/client";

const userSelect = { select: { id: true, name: true, email: true } };
const reviewerSelect = { select: { id: true, name: true } };

export async function getSubmissionsByUser(
  userId: string,
  filters?: { type?: SubmissionType; status?: SubmissionStatus }
) {
  return prisma.submission.findMany({
    where: {
      userId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
    },
    include: { reviewer: reviewerSelect },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllSubmissions(filters?: {
  type?: SubmissionType;
  status?: SubmissionStatus;
  userId?: string;
  search?: string;
}) {
  return prisma.submission.findMany({
    where: {
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.search && {
        OR: [
          { title: { contains: filters.search, mode: "insensitive" } },
          { content: { contains: filters.search, mode: "insensitive" } },
        ],
      }),
    },
    include: { user: userSelect, reviewer: reviewerSelect },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSubmissionById(
  id: string,
  requestingUserId?: string,
  isAdmin?: boolean
) {
  const submission = await prisma.submission.findUnique({
    where: { id },
    include: { user: userSelect, reviewer: reviewerSelect },
  });

  if (!submission) {
    throw new Error("Pengaduan tidak ditemukan");
  }

  if (!isAdmin && requestingUserId && submission.userId !== requestingUserId) {
    throw new Error("Akses ditolak");
  }

  return submission;
}

export async function createSubmission(
  userId: string,
  type: SubmissionType,
  title: string,
  content: string
) {
  return prisma.submission.create({
    data: { userId, type, title, content },
    include: { user: userSelect },
  });
}

export async function reviewSubmission(
  id: string,
  reviewerId: string,
  status: "IN_REVIEW" | "RESOLVED" | "CLOSED",
  adminNote?: string
) {
  const submission = await prisma.submission.findUnique({ where: { id } });
  if (!submission) {
    throw new Error("Pengaduan tidak ditemukan");
  }

  return prisma.submission.update({
    where: { id },
    data: {
      status,
      adminNote: adminNote ?? submission.adminNote,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    include: { user: userSelect, reviewer: reviewerSelect },
  });
}
