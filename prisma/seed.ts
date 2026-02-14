import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (order matters due to foreign keys)
  await prisma.paymentMonth.deleteMany();
  await prisma.income.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.staffSchedule.deleteMany();
  await prisma.shiftTemplate.deleteMany();
  await prisma.shiftReport.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.house.deleteMany();
  await prisma.houseType.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();

  const hashedIPL2026 = await bcrypt.hash("sakura2026", 10);
  const hashedPassword123 = await bcrypt.hash("password123", 10);

  // Seed Users
  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@smartresidence.com",
      password: hashedIPL2026,
      role: "ADMIN",
      isFirstLogin: true,
      createdAt: new Date("2026-01-01"),
    },
  });

  const john = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john@gmail.com",
      password: hashedIPL2026,
      role: "USER",
      isFirstLogin: true,
      createdAt: new Date("2026-01-05"),
    },
  });

  const jane = await prisma.user.create({
    data: {
      name: "Jane Smith",
      email: "jane@gmail.com",
      password: hashedPassword123,
      role: "USER",
      isFirstLogin: false,
      createdAt: new Date("2026-01-10"),
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Wilson",
      email: "bob@gmail.com",
      password: hashedPassword123,
      role: "USER",
      isFirstLogin: false,
      createdAt: new Date("2026-01-15"),
    },
  });

  // Seed Staff Users
  const securityStaff1 = await prisma.user.create({
    data: {
      name: "Ahmad Satria",
      email: "ahmad.security@smartresidence.com",
      password: hashedIPL2026,
      role: "STAFF",
      staffJobType: "SECURITY",
      isFirstLogin: false,
      createdAt: new Date("2026-01-02"),
    },
  });

  const securityStaff2 = await prisma.user.create({
    data: {
      name: "Budi Santoso",
      email: "budi.security@smartresidence.com",
      password: hashedIPL2026,
      role: "STAFF",
      staffJobType: "SECURITY",
      isFirstLogin: false,
      createdAt: new Date("2026-01-02"),
    },
  });

  const cleaningStaff1 = await prisma.user.create({
    data: {
      name: "Siti Rahayu",
      email: "siti.cleaning@smartresidence.com",
      password: hashedIPL2026,
      role: "STAFF",
      staffJobType: "CLEANING",
      isFirstLogin: false,
      createdAt: new Date("2026-01-03"),
    },
  });

  const gardeningStaff1 = await prisma.user.create({
    data: {
      name: "Joko Widodo",
      email: "joko.gardening@smartresidence.com",
      password: hashedIPL2026,
      role: "STAFF",
      staffJobType: "GARDENING",
      isFirstLogin: false,
      createdAt: new Date("2026-01-03"),
    },
  });

  // Seed Shift Templates
  const securityMorningShift = await prisma.shiftTemplate.create({
    data: {
      jobType: "SECURITY",
      shiftName: "Morning",
      startTime: "06:00",
      endTime: "14:00",
      toleranceMinutes: 15,
      isActive: true,
    },
  });

  const securityEveningShift = await prisma.shiftTemplate.create({
    data: {
      jobType: "SECURITY",
      shiftName: "Evening",
      startTime: "14:00",
      endTime: "22:00",
      toleranceMinutes: 15,
      isActive: true,
    },
  });

  const cleaningDayShift = await prisma.shiftTemplate.create({
    data: {
      jobType: "CLEANING",
      shiftName: "Day Shift",
      startTime: "08:00",
      endTime: "16:00",
      toleranceMinutes: 10,
      isActive: true,
    },
  });

  const gardeningDayShift = await prisma.shiftTemplate.create({
    data: {
      jobType: "GARDENING",
      shiftName: "Day Shift",
      startTime: "08:00",
      endTime: "16:00",
      toleranceMinutes: 10,
      isActive: true,
    },
  });

  const maintenanceDayShift = await prisma.shiftTemplate.create({
    data: {
      jobType: "MAINTENANCE",
      shiftName: "Day Shift",
      startTime: "08:00",
      endTime: "17:00",
      toleranceMinutes: 15,
      isActive: true,
    },
  });

  // Seed House Types
  const tipe36 = await prisma.houseType.create({
    data: {
      typeName: "Tipe 36",
      price: 150000,
      description: "Rumah tipe 36 dengan luas tanah 72m²",
    },
  });

  const tipe45 = await prisma.houseType.create({
    data: {
      typeName: "Tipe 45",
      price: 200000,
      description: "Rumah tipe 45 dengan luas tanah 90m²",
    },
  });

  const tipe60 = await prisma.houseType.create({
    data: {
      typeName: "Tipe 60",
      price: 250000,
      description: "Rumah tipe 60 dengan luas tanah 120m²",
    },
  });

  // Seed Houses
  const houseA01 = await prisma.house.create({
    data: {
      houseNumber: "A-01",
      block: "A",
      houseTypeId: tipe36.id,
      userId: john.id,
    },
  });

  const houseA02 = await prisma.house.create({
    data: {
      houseNumber: "A-02",
      block: "A",
      houseTypeId: tipe45.id,
      userId: jane.id,
    },
  });

  const houseB01 = await prisma.house.create({
    data: {
      houseNumber: "B-01",
      block: "B",
      houseTypeId: tipe60.id,
      userId: bob.id,
    },
  });

  await prisma.house.create({
    data: {
      houseNumber: "B-02",
      block: "B",
      houseTypeId: tipe36.id,
      userId: null,
    },
  });

  await prisma.house.create({
    data: {
      houseNumber: "C-01",
      block: "C",
      houseTypeId: tipe45.id,
      userId: null,
    },
  });

  // Seed Payments
  // Payment 1: John, APPROVED, covers Jan–Mar 2026
  const payment1 = await prisma.payment.create({
    data: {
      userId: john.id,
      houseId: houseA01.id,
      amountMonths: 3,
      totalAmount: 450000,
      proofImagePath: "/mock-receipt-1.jpg",
      status: "APPROVED",
      approvedBy: admin.id,
      approvedAt: new Date("2026-01-20"),
      createdAt: new Date("2026-01-15"),
    },
  });

  await prisma.paymentMonth.createMany({
    data: [
      { paymentId: payment1.id, year: 2026, month: 1 },
      { paymentId: payment1.id, year: 2026, month: 2 },
      { paymentId: payment1.id, year: 2026, month: 3 },
    ],
  });

  // Payment 2: John, PENDING, covers Apr–May 2026 (Jan–Mar already taken by Payment 1)
  const payment2 = await prisma.payment.create({
    data: {
      userId: john.id,
      houseId: houseA01.id,
      amountMonths: 2,
      totalAmount: 300000,
      proofImagePath: "/mock-receipt-2.jpg",
      status: "PENDING",
      createdAt: new Date("2026-01-25"),
    },
  });

  await prisma.paymentMonth.createMany({
    data: [
      { paymentId: payment2.id, year: 2026, month: 4 },
      { paymentId: payment2.id, year: 2026, month: 5 },
    ],
  });

  // Payment 3: Jane, APPROVED, covers Jan–Jun 2026
  const payment3 = await prisma.payment.create({
    data: {
      userId: jane.id,
      houseId: houseA02.id,
      amountMonths: 6,
      totalAmount: 1200000,
      proofImagePath: "/mock-receipt-3.jpg",
      status: "APPROVED",
      approvedBy: admin.id,
      approvedAt: new Date("2026-01-18"),
      createdAt: new Date("2026-01-16"),
    },
  });

  await prisma.paymentMonth.createMany({
    data: [
      { paymentId: payment3.id, year: 2026, month: 1 },
      { paymentId: payment3.id, year: 2026, month: 2 },
      { paymentId: payment3.id, year: 2026, month: 3 },
      { paymentId: payment3.id, year: 2026, month: 4 },
      { paymentId: payment3.id, year: 2026, month: 5 },
      { paymentId: payment3.id, year: 2026, month: 6 },
    ],
  });

  // Payment 4: Bob, REJECTED, covers Jan 2026 (REJECTED so doesn't block)
  const payment4 = await prisma.payment.create({
    data: {
      userId: bob.id,
      houseId: houseB01.id,
      amountMonths: 1,
      totalAmount: 250000,
      proofImagePath: "/mock-receipt-4.jpg",
      status: "REJECTED",
      rejectionNote:
        "Bukti transfer tidak jelas, mohon upload ulang dengan kualitas lebih baik",
      createdAt: new Date("2026-01-22"),
    },
  });

  await prisma.paymentMonth.createMany({
    data: [
      { paymentId: payment4.id, year: 2026, month: 1 },
    ],
  });

  // Payment 5: Bob, PENDING, covers Jan–Mar 2026 (Jan is free because Payment 4 is REJECTED)
  const payment5 = await prisma.payment.create({
    data: {
      userId: bob.id,
      houseId: houseB01.id,
      amountMonths: 3,
      totalAmount: 750000,
      proofImagePath: "/mock-receipt-5.jpg",
      status: "PENDING",
      createdAt: new Date("2026-01-28"),
    },
  });

  await prisma.paymentMonth.createMany({
    data: [
      { paymentId: payment5.id, year: 2026, month: 1 },
      { paymentId: payment5.id, year: 2026, month: 2 },
      { paymentId: payment5.id, year: 2026, month: 3 },
    ],
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
