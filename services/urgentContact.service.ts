import { prisma } from "@/lib/prisma";

// Get active contacts only, ordered by order asc then createdAt asc
export async function getUrgentContacts() {
  return prisma.urgentContact.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      serviceType: true,
      phone: true,
      order: true,
    },
  });
}

// Get all contacts (including inactive) for admin
export async function getAllUrgentContacts() {
  return prisma.urgentContact.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: {
      creator: { select: { id: true, name: true } },
    },
  });
}

// Get single contact by ID
export async function getUrgentContactById(id: string) {
  return prisma.urgentContact.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true } },
    },
  });
}

// Create a new urgent contact
export async function createUrgentContact(data: {
  name: string;
  serviceType: string;
  phone: string;
  order: number;
  createdBy: string;
}) {
  return prisma.urgentContact.create({
    data,
    include: {
      creator: { select: { id: true, name: true } },
    },
  });
}

// Update an existing urgent contact
export async function updateUrgentContact(
  id: string,
  data: {
    name?: string;
    serviceType?: string;
    phone?: string;
    order?: number;
    isActive?: boolean;
  }
) {
  return prisma.urgentContact.update({
    where: { id },
    data,
    include: {
      creator: { select: { id: true, name: true } },
    },
  });
}

// Hard delete an urgent contact
export async function deleteUrgentContact(id: string) {
  return prisma.urgentContact.delete({ where: { id } });
}
