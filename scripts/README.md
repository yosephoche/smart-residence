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

---

## cleanup-data.ts

Removes all transactional, property, and staff data from the database while preserving admin users and system configuration.

### ⚠️ WARNING

**THIS IS A DESTRUCTIVE OPERATION!**
- Deletes ALL user and staff accounts (except admins)
- Deletes ALL payments, expenses, incomes
- Deletes ALL houses and house types
- Deletes ALL attendance, schedules, and shift data
- **CANNOT BE UNDONE** without a database backup
- **ALWAYS BACKUP BEFORE RUNNING**

### Usage

**Dry run (REQUIRED first step)**:
```bash
npm run cleanup-data:dry-run
```

**Execute (after backup and dry-run review)**:
```bash
npm run cleanup-data
```

### What it does

1. Validates at least 1 admin user exists
2. Counts all records to be deleted
3. Shows detailed preview of what will be deleted vs preserved
4. Executes deletions in transaction (respects FK constraints)
5. Provides summary report

### Preserved Data

✅ **KEPT**:
- Admin users (role = 'ADMIN')
- SystemConfig (upload window, default password, geofence settings)

### Deleted Data

❌ **REMOVED**:
- User and Staff accounts (role = 'USER' or 'STAFF')
- All transactional data: Payments, Expenses, Incomes
- All property data: Houses, House types
- All staff data: Attendance, Shift reports, Schedules, Shift templates

### Deletion Order

Script deletes in this order to respect foreign key constraints:

1. ShiftReport
2. Attendance
3. StaffSchedule
4. ShiftTemplate
5. Income
6. Expense
7. Payment (PaymentMonth cascades automatically)
8. House
9. HouseType
10. User (USER/STAFF roles only)

### Safety Features

- **Admin validation**: Aborts if no admin users found
- **Dry run**: Preview before executing
- **Transaction**: All-or-nothing execution (rollback on error)
- **3-second delay**: Time to cancel before execution
- **Detailed logging**: Progress tracking for each step

### Pre-Execution Checklist

Before running cleanup:

1. ✅ Run dry-run first: `npm run cleanup-data:dry-run`
2. ✅ Review deletion counts carefully
3. ✅ **BACKUP DATABASE** (via Supabase dashboard or pg_dump)
4. ✅ Verify at least 1 admin user exists
5. ✅ Consider backing up Cloudinary files separately

### Post-Execution Verification

After cleanup completes:

1. ✅ Test admin login at `/login`
2. ✅ Verify dashboard loads at `/admin`
3. ✅ Check system settings at `/admin/settings`
4. ✅ Confirm all tables are empty (except User with admins, SystemConfig)

### Cloudinary File Cleanup (Optional)

The script only cleans the database. To remove uploaded files:

**Manual cleanup via Cloudinary Dashboard**:
1. Log in to [Cloudinary Console](https://cloudinary.com/console)
2. Go to Media Library
3. Delete these folders:
   - `smartresidence/payments` (payment proof images)
   - `smartresidence/attendance` (staff selfies)
   - `smartresidence/reports` (shift report photos)

**Alternative: Cloudinary CLI**:
```bash
# Install CLI
npm install -g cloudinary-cli

# Configure credentials
cld config

# Delete folders
cld destroy smartresidence/payments --resource-type image --invalidate
cld destroy smartresidence/attendance --resource-type image --invalidate
cld destroy smartresidence/reports --resource-type image --invalidate
```

### Rollback

If cleanup causes issues:

**Option 1: Restore from backup**
- Use Supabase dashboard: Database → Backups → Restore
- Or restore from `pg_dump` backup file

**Option 2: Point-in-time recovery**
- Available in Supabase Pro plan
- Restore to timestamp before cleanup

**Note**: Uploaded files in Cloudinary are NOT restored automatically. Keep Cloudinary backups separate if needed.

### Use Cases

When to use this script:
- Cleaning up test/demo data before production launch
- Resetting development environment to clean state
- Removing old data while keeping admin access
- Starting fresh after data migration testing

### Troubleshooting

**"No admin users found" error**:
- Create an admin user first
- Or restore from backup if accidentally deleted

**Transaction timeout**:
- Increase timeout in script (currently 60s)
- Or split into multiple smaller transactions

**Foreign key constraint errors**:
- Should not happen - deletion order is carefully designed
- Report as bug if encountered
