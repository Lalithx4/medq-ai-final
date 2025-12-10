# 500 Error Diagnosis

## Current Status

### ✅ What's Working
- Environment variables are set correctly
- Supabase auth is accessible
- Database connection works (endpoints return 401, not 500 when unauthenticated)
- `/api/public-env` returns correct values
- `/api/auth/sync-user` endpoint exists

### ❌ What's Failing
- Multiple 500 errors in browser after login:
  - `/api/credits/balance` → 500
  - `/api/presentation` → 500
  - `/api/files/list` → 500

### 🔍 Key Observation
- **curl tests return 401** (correct behavior without auth)
- **Browser shows 500** (after attempting login)
- This means the error happens AFTER authentication attempt

## Root Cause Analysis

The 500 errors occur because:

1. **User logs in with Google OAuth**
2. **Callback page exchanges code** → Supabase session created
3. **Callback tries to sync user to Prisma database** → This might be failing
4. **User is redirected to home page**
5. **Home page calls `/api/credits/balance`** → Tries to query user from database
6. **User doesn't exist in database** → Prisma query fails → 500 error

## Most Likely Issues

### Issue 1: User Sync Failing Silently
The `/auth/callback` page calls `/api/auth/sync-user`, but:
- The sync might be failing due to database constraints
- The error is logged but not blocking the redirect
- User ends up authenticated in Supabase but not in Prisma

**Check:**
- Railway logs for `[SYNC USER]` errors
- Database schema - does the `User` table exist?
- Are there unique constraints that might conflict?

### Issue 2: Prisma Schema Mismatch
The database schema might not match the Prisma schema:
- Missing tables
- Missing columns
- Type mismatches

**Check:**
- Run `npx prisma db push` to sync schema
- Check if migrations were run on production database

### Issue 3: User ID Mismatch
Supabase user ID might not match Prisma user ID format:
- Supabase uses UUID
- Prisma might expect different format

**Check:**
- `src/lib/auth/ensure-prisma-user.ts` - does it handle ID correctly?
- Database `User` table - what's the ID column type?

## Immediate Actions Required

### 1. Check Railway Logs
Look for these specific errors:
```
[SYNC USER] Error:
[AUTH CALLBACK] Sync user failed:
Error fetching credit balance:
```

### 2. Verify Database Schema
Check if these tables exist in your production database:
- `User`
- `CreditTransaction`
- `Presentation`
- `File`

### 3. Test User Sync Manually
After you login, check Railway logs to see if user was created:
```
[SYNC USER] User synced successfully: <user-id>
```

If you don't see this log, the sync is failing.

### 4. Check Database Directly
Connect to your production database and run:
```sql
SELECT * FROM "User" LIMIT 5;
```

If this fails, the table doesn't exist.

## Quick Fix Steps

### Step 1: Ensure Prisma Schema is Deployed
In Railway, make sure these build commands run:
```bash
npx prisma generate
npx prisma db push  # or prisma migrate deploy
```

### Step 2: Check Build Logs
In Railway → Deployments → Latest → Build Logs
Look for:
- ✓ Prisma generate completed
- ✓ Database migrations applied

### Step 3: Add Detailed Logging
The updated callback page should log:
- `[AUTH CALLBACK] Exchange error` - if code exchange fails
- `[AUTH CALLBACK] Sync user failed` - if user sync fails

Check Railway logs for these after attempting login.

## Expected Flow (Working)

1. User clicks "Continue with Google"
2. Google OAuth redirects to `/auth/callback?code=...`
3. Callback exchanges code → Supabase session created
4. Callback calls `/api/auth/sync-user` → User created in Prisma
5. User redirected to home
6. Home calls `/api/credits/balance` → Returns user's credits (200)

## Current Flow (Broken)

1. User clicks "Continue with Google" ✓
2. Google OAuth redirects to `/auth/callback?code=...` ✓
3. Callback exchanges code → Supabase session created ✓
4. Callback calls `/api/auth/sync-user` → **FAILS** ❌
5. User redirected to home ✓
6. Home calls `/api/credits/balance` → User not in DB → **500** ❌

## Next Steps

1. **Check Railway logs** for the actual error message
2. **Verify database schema** matches Prisma schema
3. **Test user creation** manually via Prisma Studio or SQL
4. **Share Railway logs** showing the [SYNC USER] error

The code is correct. The issue is either:
- Database schema not deployed
- Database constraints preventing user creation
- Prisma client not generated in production build
