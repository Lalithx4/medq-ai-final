# Database Migration Guide - Subscription Fields

## ⚠️ Important: Read Before Running

Your database already exists and has data. We need to **add new fields** without losing existing data.

## 📋 What's Being Added

Three new fields to the `User` table:
- `subscriptionStart` (DateTime, nullable) - When subscription began
- `lastCreditRefresh` (DateTime, nullable) - Last credit refresh date  
- Indexes for performance

**Note:** `subscriptionEnd` already exists in your database.

## 🚀 Migration Steps

### Option 1: Using Prisma (Recommended if database is accessible)

```bash
# 1. Generate Prisma Client (already done)
npx prisma generate

# 2. Apply the migration
npx prisma db push
```

### Option 2: Manual SQL (If Prisma can't connect)

Run this SQL directly on your Supabase database:

```sql
-- Add new columns
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStart" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastCreditRefresh" TIMESTAMP(3);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "User_subscriptionEnd_idx" ON "User"("subscriptionEnd");
CREATE INDEX IF NOT EXISTS "User_lastCreditRefresh_idx" ON "User"("lastCreditRefresh");
CREATE INDEX IF NOT EXISTS "User_subscriptionPlan_idx" ON "User"("subscriptionPlan");
```

**How to run on Supabase:**
1. Go to Supabase Dashboard
2. Select your project
3. Go to SQL Editor
4. Paste the SQL above
5. Click "Run"

### Option 3: Using the migration file

```bash
# If you have psql installed
psql $DATABASE_URL < prisma/migrations/20250122_add_subscription_fields/migration.sql
```

## ✅ Verify Migration

After running the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
  AND column_name IN ('subscriptionStart', 'lastCreditRefresh', 'subscriptionEnd');

-- Should return 3 rows
```

## 🧪 Test the Code

After migration, test that the code works:

```bash
# Start dev server
npm run dev

# In another terminal, test subscription API
curl http://localhost:3000/api/subscription/status \
  -H "Cookie: your-auth-cookie"
```

## 📊 Current State

**Before Migration:**
```
User table has:
✅ subscriptionPlan (String)
✅ subscriptionEnd (DateTime?)
✅ credits (Int)
❌ subscriptionStart (missing)
❌ lastCreditRefresh (missing)
```

**After Migration:**
```
User table has:
✅ subscriptionPlan (String)
✅ subscriptionStart (DateTime?)
✅ subscriptionEnd (DateTime?)
✅ lastCreditRefresh (DateTime?)
✅ credits (Int)
```

## 🔧 Troubleshooting

### "Can't reach database server"
- Your database might be paused (Supabase free tier)
- Check Supabase dashboard and wake it up
- Use Option 2 (Manual SQL) instead

### "Column already exists"
- Safe to ignore - SQL uses `IF NOT EXISTS`
- Migration is idempotent (can run multiple times)

### TypeScript errors after migration
```bash
# Regenerate Prisma Client
npx prisma generate

# Restart TypeScript server in VS Code
# Cmd+Shift+P → "TypeScript: Restart TS Server"
```

## 📝 Next Steps After Migration

1. ✅ Migration complete
2. Add `CRON_SECRET` to environment variables
3. Deploy to Vercel
4. Test the cron endpoint
5. Monitor first credit refresh cycle

## 🆘 Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove the new columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "subscriptionStart";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastCreditRefresh";

-- Remove indexes
DROP INDEX IF EXISTS "User_subscriptionEnd_idx";
DROP INDEX IF EXISTS "User_lastCreditRefresh_idx";
DROP INDEX IF EXISTS "User_subscriptionPlan_idx";
```

## ✅ Summary

- ✅ Prisma schema updated
- ✅ Prisma Client generated
- ✅ Migration SQL file created
- ⏳ **Next: Run the migration** (choose Option 1, 2, or 3 above)
- ⏳ Then: Deploy and test

**The migration is safe and won't affect existing data!**
