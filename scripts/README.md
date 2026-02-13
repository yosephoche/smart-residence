# Migration Scripts

## backfill-income.ts

Backfills income records for approved payments without linked income entries.

### Usage

**Dry run (preview)**:
```bash
npm run backfill-income:dry-run
```

**Execute**:
```bash
npm run backfill-income
```

### What it does

1. Finds approved payments without income records
2. Validates each payment has required data
3. Creates income records using auto-tracking pattern
4. Uses transaction for atomicity

### Safety Features

- **Idempotent**: Safe to run multiple times
- **Dry run**: Preview before executing
- **Validation**: Checks data integrity
- **Transaction**: All-or-nothing execution
- **Detailed logging**: Progress tracking

### Rollback

If needed, delete backfilled income:

```sql
DELETE FROM "Income"
WHERE "paymentId" IS NOT NULL
AND notes LIKE 'Auto-generated from payment #%'
AND "createdAt" >= '2026-02-12 16:00:00'; -- Use actual migration timestamp
```

**WARNING**: This will delete ALL auto-generated income, including from live feature.
