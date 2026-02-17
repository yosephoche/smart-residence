import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("🧹 Starting database cleanup script...\n");
  console.log("⚠️  WARNING: This will delete ALL data except admin users and system config!\n");

  // Step 1: Count what will be deleted
  console.log("📊 Scanning database...\n");

  const counts = await Promise.all([
    prisma.user.count({ where: { role: { in: ["USER", "STAFF"] } } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.shiftReport.count(),
    prisma.attendance.count(),
    prisma.staffSchedule.count(),
    prisma.shiftTemplate.count(),
    prisma.income.count(),
    prisma.expense.count(),
    prisma.payment.count(),
    prisma.paymentMonth.count(),
    prisma.house.count(),
    prisma.houseType.count(),
    prisma.systemConfig.count(),
  ]);

  const [
    userStaffCount,
    adminCount,
    shiftReportCount,
    attendanceCount,
    staffScheduleCount,
    shiftTemplateCount,
    incomeCount,
    expenseCount,
    paymentCount,
    paymentMonthCount,
    houseCount,
    houseTypeCount,
    systemConfigCount,
  ] = counts;

  // Step 2: Validation - ensure at least 1 admin remains
  if (adminCount === 0) {
    console.error("❌ FATAL: No admin users found in database!\n");
    console.error("   Cannot proceed - you need at least 1 admin to access the system.\n");
    process.exit(1);
  }

  // Step 3: Display deletion preview
  console.log("📋 Deletion Preview:\n");
  console.log("   ✅ PRESERVED:");
  console.log(`      • Admin users: ${adminCount}`);
  console.log(`      • System config: ${systemConfigCount}\n`);

  console.log("   ❌ WILL BE DELETED:");
  console.log(`      • User/Staff accounts: ${userStaffCount}`);
  console.log(`      • Shift reports: ${shiftReportCount}`);
  console.log(`      • Attendance records: ${attendanceCount}`);
  console.log(`      • Staff schedules: ${staffScheduleCount}`);
  console.log(`      • Shift templates: ${shiftTemplateCount}`);
  console.log(`      • Income records: ${incomeCount}`);
  console.log(`      • Expense records: ${expenseCount}`);
  console.log(`      • Payments: ${paymentCount}`);
  console.log(`      • Payment months: ${paymentMonthCount} (cascade)`);
  console.log(`      • Houses: ${houseCount}`);
  console.log(`      • House types: ${houseTypeCount}\n`);

  const totalRecords = userStaffCount + shiftReportCount + attendanceCount +
                       staffScheduleCount + shiftTemplateCount + incomeCount +
                       expenseCount + paymentCount + houseCount + houseTypeCount;

  console.log(`   📦 Total records to delete: ${totalRecords}\n`);

  if (isDryRun) {
    console.log("🏁 DRY RUN: No changes made.\n");
    console.log("   To execute cleanup: npm run cleanup-data\n");
    console.log("   ⚠️  IMPORTANT: Backup your database before running!\n");
    return;
  }

  // Step 4: Final confirmation (only in production mode)
  console.log("⏳ Starting deletion in 3 seconds...\n");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 5: Execute deletion in transaction
  console.log("🚀 Executing cleanup transaction...\n");

  const deletionResults = await prisma.$transaction(async (tx) => {
    // Delete in order respecting FK constraints

    // 1. ShiftReport (FK: staffId, attendanceId)
    const shiftReports = await tx.shiftReport.deleteMany();
    console.log(`   ✅ Deleted ${shiftReports.count} shift reports`);

    // 2. Attendance (FK: staffId, scheduleId)
    const attendances = await tx.attendance.deleteMany();
    console.log(`   ✅ Deleted ${attendances.count} attendance records`);

    // 3. StaffSchedule (FK: staffId, shiftTemplateId, createdBy)
    const staffSchedules = await tx.staffSchedule.deleteMany();
    console.log(`   ✅ Deleted ${staffSchedules.count} staff schedules`);

    // 4. ShiftTemplate (no user FK, but referenced by schedules)
    const shiftTemplates = await tx.shiftTemplate.deleteMany();
    console.log(`   ✅ Deleted ${shiftTemplates.count} shift templates`);

    // 5. Income (FK: createdBy, paymentId)
    const incomes = await tx.income.deleteMany();
    console.log(`   ✅ Deleted ${incomes.count} income records`);

    // 6. Expense (FK: createdBy)
    const expenses = await tx.expense.deleteMany();
    console.log(`   ✅ Deleted ${expenses.count} expense records`);

    // 7. Payment (FK: userId, houseId, approvedBy) - PaymentMonth cascades
    const payments = await tx.payment.deleteMany();
    console.log(`   ✅ Deleted ${payments.count} payments (+ payment months cascade)`);

    // 8. House (FK: userId, houseTypeId)
    const houses = await tx.house.deleteMany();
    console.log(`   ✅ Deleted ${houses.count} houses`);

    // 9. HouseType (referenced by House)
    const houseTypes = await tx.houseType.deleteMany();
    console.log(`   ✅ Deleted ${houseTypes.count} house types`);

    // 10. User where role IN ('USER', 'STAFF')
    const users = await tx.user.deleteMany({
      where: {
        role: { in: ["USER", "STAFF"] }
      }
    });
    console.log(`   ✅ Deleted ${users.count} user/staff accounts`);

    return {
      shiftReports: shiftReports.count,
      attendances: attendances.count,
      staffSchedules: staffSchedules.count,
      shiftTemplates: shiftTemplates.count,
      incomes: incomes.count,
      expenses: expenses.count,
      payments: payments.count,
      houses: houses.count,
      houseTypes: houseTypes.count,
      users: users.count,
    };
  }, {
    maxWait: 20000, // Maximum wait time to acquire a connection (20s)
    timeout: 60000,  // Maximum transaction duration (60s)
  });

  // Step 6: Summary
  const totalDeleted = Object.values(deletionResults).reduce((sum, count) => sum + count, 0);

  console.log("\n" + "=".repeat(60));
  console.log("✨ Cleanup completed successfully!\n");
  console.log(`   📊 Total records deleted: ${totalDeleted}`);
  console.log(`   ✅ Admin users preserved: ${adminCount}`);
  console.log(`   ✅ System config preserved: ${systemConfigCount}`);
  console.log("=".repeat(60) + "\n");

  console.log("📝 Next steps:");
  console.log("   1. Verify admin login still works");
  console.log("   2. Check admin dashboard");
  console.log("   3. (Optional) Clean up Cloudinary files manually\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Cleanup failed:\n", error);
    console.error("\n⚠️  Transaction rolled back - no changes made.\n");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
