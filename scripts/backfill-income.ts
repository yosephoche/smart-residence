import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log("🔍 Scanning for approved payments without income records...\n");

  // Find target payments
  const payments = await prisma.payment.findMany({
    where: {
      status: "APPROVED",
      income: null,  // No linked income record
    },
    include: {
      user: { select: { id: true, name: true } },
      house: { select: { houseNumber: true, block: true } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: { approvedAt: "asc" },
  });

  if (payments.length === 0) {
    console.log("✅ No payments need backfill. All approved payments have income.\n");
    return;
  }

  console.log(`📊 Found ${payments.length} approved payments without income:\n`);

  // Validate all payments
  const validationErrors: Array<{ paymentId: string; error: string }> = [];

  for (const payment of payments) {
    if (!payment.approvedAt) {
      validationErrors.push({ paymentId: payment.id, error: "Missing approvedAt" });
    }
    if (!payment.approvedBy) {
      validationErrors.push({ paymentId: payment.id, error: "Missing approvedBy" });
    }
    if (!payment.approver) {
      validationErrors.push({ paymentId: payment.id, error: "Approver user not found" });
    }
  }

  if (validationErrors.length > 0) {
    console.error("❌ Validation errors:\n");
    validationErrors.forEach(({ paymentId, error }) => {
      console.error(`   Payment ${paymentId}: ${error}`);
    });
    console.error("\n⚠️  Migration aborted. Fix these issues and re-run.\n");
    process.exit(1);
  }

  // Preview changes
  console.log("📋 Preview of income records to be created:\n");
  payments.forEach((payment, index) => {
    console.log(`${index + 1}. Payment #${payment.id.slice(0, 8)}...`);
    console.log(`   User: ${payment.user.name}`);
    console.log(`   House: ${payment.house.block} ${payment.house.houseNumber}`);
    console.log(`   Amount: Rp ${payment.totalAmount.toString()}`);
    console.log(`   Approved: ${payment.approvedAt?.toISOString().split('T')[0]}\n`);
  });

  if (isDryRun) {
    console.log("🏁 DRY RUN: No changes made.\n");
    console.log("   To execute: npm run backfill-income\n");
    return;
  }

  // Execute migration in transaction
  console.log("🚀 Starting migration...\n");

  let successCount = 0;
  let skippedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const payment of payments) {
      // Double-check no income exists (idempotency)
      const existingIncome = await tx.income.findUnique({
        where: { paymentId: payment.id },
      });

      if (existingIncome) {
        console.log(`⏭️  Skipped #${payment.id.slice(0, 8)}... (already exists)`);
        skippedCount++;
        continue;
      }

      // Create income record (exact pattern from payment.service.ts)
      const description = `IPL Payment - ${payment.user.name} - ${payment.house.block} ${payment.house.houseNumber} - ${payment.amountMonths} bulan`;

      await tx.income.create({
        data: {
          date: payment.approvedAt!,
          category: "MONTHLY_FEES",
          amount: payment.totalAmount,
          description,
          notes: `Auto-generated from payment #${payment.id}`,
          createdBy: payment.approvedBy!,
          paymentId: payment.id,
        },
      });

      console.log(`✅ Created income for #${payment.id.slice(0, 8)}...`);
      successCount++;
    }
  }, {
    maxWait: 15000, // Maximum wait time to acquire a connection (15s)
    timeout: 30000,  // Maximum transaction duration (30s)
  });

  // Summary
  console.log("\n" + "=".repeat(50));
  console.log("✨ Migration completed!\n");
  console.log(`   Total processed: ${payments.length}`);
  console.log(`   Created: ${successCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log("=".repeat(50) + "\n");
}

main()
  .catch((error) => {
    console.error("\n❌ Migration failed:\n", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
