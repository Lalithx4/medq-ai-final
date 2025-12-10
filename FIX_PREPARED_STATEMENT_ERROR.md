# Fix: Prepared Statement Error with Supabase Pooling

## Error
```
prepared statement "s0" already exists
PostgresError { code: "42P05" }
```

## Root Cause
Prisma uses prepared statements by default, but Supabase's **Transaction mode** connection pooling doesn't support them. The prepared statements persist across connections in the pool, causing conflicts.

## Solution: Add `pgbouncer=true` to DATABASE_URL

### In Railway:

1. Go to **Railway** → Your Service → **Variables**
2. Find `DATABASE_URL`
3. Add `?pgbouncer=true` to the end of the URL:

**Before:**
```
postgresql://postgres.vjkxwklusgjxcpddcwjl:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**After:**
```
postgresql://postgres.vjkxwklusgjxcpddcwjl:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

4. Click **Save**
5. **Redeploy** the service

### What This Does

The `?pgbouncer=true` parameter tells Prisma to:
- Disable prepared statements
- Use simple query protocol instead
- Work correctly with PgBouncer/connection pooling

### Alternative: Use Session Mode

If you prefer, you can use Supabase's **Session mode** pooling instead:

1. Go to **Supabase Dashboard** → Project Settings → **Database**
2. Under **Connection Pooling**, select **Session mode**
3. Copy the Session mode connection string
4. Update `DATABASE_URL` in Railway
5. Redeploy

Session mode supports prepared statements but uses more resources.

## Verify the Fix

After redeploying, the errors should disappear and you should see successful queries in Railway logs.

Test by visiting your app and checking:
- `/api/credits/balance` returns 200
- `/api/files/list` returns 200
- No more "prepared statement already exists" errors in logs
