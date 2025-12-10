# Apply Token Tracking Migration to Supabase

## 🎯 Goal
Add the TokenUsage table and update the User table with token tracking fields.

---

## 📋 Option 1: Apply via Supabase Dashboard (Recommended)

### Steps:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `edxijcfybryqcffokimr`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run the Migration**
   - Open the file: `migrations/add_token_tracking.sql`
   - Copy all the SQL code
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify Success**
   - You should see success messages
   - Check "Table Editor" to see the new `TokenUsage` table
   - Check `User` table for new columns:
     - `totalInputTokens`
     - `totalOutputTokens`
     - `totalTokens`
     - `totalTokenCost`

---

## 📋 Option 2: Apply via Prisma CLI

If the connection works:

```bash
# Try the migration
pnpm prisma db push

# Or create a proper migration
pnpm prisma migrate dev --name add_token_tracking
```

---

## 📋 Option 3: Apply via psql Command Line

If you have psql installed:

```bash
# Using DATABASE_URL
psql "postgresql://postgres.edxijcfybryqcffokimr:Tspl@9603044@aws-1-us-east-1.pooler.supabase.com:5432/postgres" < migrations/add_token_tracking.sql

# Or using DIRECT_URL
psql "$DIRECT_URL" < migrations/add_token_tracking.sql
```

---

## ✅ Verification

After applying the migration, verify it worked:

### Check in Supabase Dashboard:

1. **Table Editor** → Look for `TokenUsage` table
2. **Table Editor** → Open `User` table → Check for new columns

### Check via Code:

```bash
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function verify() {
  try {
    // Check if TokenUsage table exists
    const count = await prisma.tokenUsage.count();
    console.log('✅ TokenUsage table exists! Count:', count);
    
    // Check if User has new fields
    const user = await prisma.user.findFirst({
      select: {
        totalInputTokens: true,
        totalOutputTokens: true,
        totalTokens: true,
        totalTokenCost: true,
      }
    });
    console.log('✅ User token fields exist!', user);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

verify();
"
```

---

## 🔧 Troubleshooting

### Issue: "relation TokenUsage does not exist"

**Solution:** Migration not applied yet. Use Option 1 (Supabase Dashboard).

### Issue: "column totalInputTokens does not exist"

**Solution:** User table not updated. Run the migration again.

### Issue: Connection timeout

**Possible causes:**
1. Database is paused (free tier auto-pauses after inactivity)
2. Network/firewall blocking connection
3. Wrong connection string

**Solutions:**
- Wake up database from Supabase dashboard
- Use Supabase Dashboard SQL Editor (Option 1)
- Check if you're on a restricted network

---

## 📊 What Gets Created

### New Table: TokenUsage

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| userId | TEXT | User who made the request |
| operation | TEXT | Type of operation |
| operationId | TEXT | ID of created resource |
| inputTokens | INTEGER | Prompt tokens |
| outputTokens | INTEGER | Completion tokens |
| totalTokens | INTEGER | Total tokens |
| modelProvider | TEXT | openai, cerebras, etc. |
| modelId | TEXT | gpt-4, llama3.1-70b, etc. |
| inputCost | FLOAT | Cost for input |
| outputCost | FLOAT | Cost for output |
| totalCost | FLOAT | Total cost (USD) |
| metadata | JSONB | Additional context |
| createdAt | TIMESTAMP | When created |

**Indexes:**
- userId
- operation
- modelProvider
- createdAt
- userId + createdAt (composite)

### Updated Table: User

**New Columns:**
- `totalInputTokens` (INTEGER, default 0)
- `totalOutputTokens` (INTEGER, default 0)
- `totalTokens` (INTEGER, default 0)
- `totalTokenCost` (FLOAT, default 0)

---

## 🚀 After Migration

Once migration is applied:

1. **Regenerate Prisma Client**
   ```bash
   pnpm prisma generate
   ```

2. **Restart Dev Server**
   ```bash
   # Stop current server (Ctrl+C)
   pnpm dev
   ```

3. **Test Token Tracking**
   ```bash
   pnpm tsx -e "
   import { TokenService } from './src/lib/tokens';
   
   // Test tracking
   await TokenService.trackUsage({
     userId: 'test-user-id',
     operation: 'test',
     inputTokens: 100,
     outputTokens: 200,
     modelProvider: 'cerebras',
     modelId: 'llama3.1-70b',
   });
   
   console.log('✅ Token tracking works!');
   "
   ```

4. **Proceed to Phase 2** - Integrate token tracking in API routes

---

## 📝 Notes

- Migration is **idempotent** - safe to run multiple times
- Uses `IF NOT EXISTS` to avoid errors
- Adds `ON DELETE CASCADE` for automatic cleanup
- All new fields have default values (0)
- Existing users will have token stats initialized to 0

---

## ✅ Success Indicators

You'll know it worked when:
- ✅ `TokenUsage` table visible in Supabase
- ✅ `User` table has 4 new columns
- ✅ Prisma Client regenerates without errors
- ✅ Test tracking code runs successfully

---

**Recommended:** Use Option 1 (Supabase Dashboard) - it's the most reliable method.
