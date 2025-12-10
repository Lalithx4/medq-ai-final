# Complete Supabase Project Migration Guide

This guide helps you migrate your entire Supabase database (schema + data + auth users) from one project to another.

---

## Prerequisites

- ✅ Supabase CLI installed (`supabase --version`)
- ✅ PostgreSQL tools installed (`pg_dump`, `psql`)
- ✅ Access to both old and new Supabase projects
- ✅ Database passwords for both projects

---

## Step 1: Create New Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: biodocs-ai-new (or your choice)
   - **Database Password**: Generate strong password (SAVE THIS!)
   - **Region**: Same as old project (for best performance)
4. Click **"Create new project"**
5. Wait 2-3 minutes for initialization

---

## Step 2: Get Database Connection Strings

### Old Project
1. Go to old Supabase project
2. **Settings** → **Database** → **Connection string**
3. Select **URI** format
4. Copy and replace `[YOUR-PASSWORD]` with your actual password
5. Example: `postgresql://postgres:your-password@db.edxijcfybryqcffokimr.supabase.co:5432/postgres`

### New Project
1. Go to new Supabase project
2. **Settings** → **Database** → **Connection string**
3. Select **URI** format
4. Copy and replace `[YOUR-PASSWORD]` with your actual password
5. Example: `postgresql://postgres:new-password@db.newproject.supabase.co:5432/postgres`

---

## Step 3: Run Migration Script

We've created an automated migration script for you.

### Run the script:

```bash
./migrate-supabase.sh
```

### The script will:
1. ✅ Export database schema (all tables, views, functions)
2. ✅ Export all data from all tables
3. ✅ Export auth users and identities
4. ✅ Import schema to new project
5. ✅ Import data to new project
6. ✅ Import auth users (optional)
7. ✅ Update sequences
8. ✅ Create backup files

### What to enter:
1. **Old database URL**: Paste your old project connection string
2. **New database URL**: Paste your new project connection string
3. **Import auth users?**: Type `y` (yes) to preserve user accounts

---

## Step 4: Configure New Project

### A. Enable Google OAuth
1. Go to new project → **Authentication** → **Providers**
2. Enable **Google**
3. Enter your Google OAuth credentials:
   - **Client ID**: (same as old project)
   - **Client Secret**: (same as old project)

### B. Set URL Configuration
1. **Authentication** → **URL Configuration**
2. **Site URL**: `https://www.biodocs.ai`
3. **Redirect URLs**:
   ```
   https://www.biodocs.ai
   https://www.biodocs.ai/auth/callback
   http://localhost:3000
   http://localhost:3000/auth/callback
   ```

### C. Configure Storage (if you use Supabase Storage)
1. **Storage** → **Policies**
2. Recreate any storage policies from old project

---

## Step 5: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services** → **Credentials**
3. Select your OAuth 2.0 Client ID
4. **Authorized redirect URIs**:
   - **Add**: `https://your-new-project.supabase.co/auth/v1/callback`
   - **Keep old one** (for now, remove after testing)
5. Click **Save**

---

## Step 6: Update Environment Variables

### Local Development (.env)

```bash
# New Supabase project
SUPABASE_URL="https://your-new-project.supabase.co"
SUPABASE_ANON_KEY="your-new-anon-key"
NEXT_PUBLIC_SUPABASE_URL="https://your-new-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-new-anon-key"

# Database connection (NEW project database)
DATABASE_URL="postgresql://postgres:new-password@db.newproject.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:new-password@db.newproject.supabase.co:5432/postgres"

# Keep other vars unchanged
NEXT_PUBLIC_APP_URL="http://localhost:3000"
OPENAI_API_KEY="..."
# etc.
```

### Get New Anon Key:
1. New project → **Settings** → **API**
2. Copy **anon/public** key

---

## Step 7: Test Locally

```bash
# Start dev server
pnpm dev
```

### Test checklist:
- [ ] Visit `http://localhost:3000/auth/login`
- [ ] Sign in with Google (should work with existing account)
- [ ] Check if you see your existing data (files, presentations)
- [ ] Test creating new content
- [ ] Test file uploads
- [ ] Test API endpoints

---

## Step 8: Update Railway (Production)

### Update these variables in Railway:

```bash
SUPABASE_URL=https://your-new-project.supabase.co
SUPABASE_ANON_KEY=your-new-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key

DATABASE_URL=postgresql://postgres:new-password@db.newproject.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:new-password@db.newproject.supabase.co:5432/postgres

# Keep other vars unchanged
NEXT_PUBLIC_APP_URL=https://www.biodocs.ai
```

Railway will auto-deploy after you save.

---

## Step 9: Test Production

1. Visit `https://www.biodocs.ai/auth/login`
2. Sign in with Google
3. Verify all data is present
4. Test all critical features:
   - File operations
   - Presentation creation
   - Image generation
   - Payments
   - Credits

---

## Step 10: Cleanup (After Confirming Everything Works)

### Remove old redirect URI from Google Cloud Console
1. Go to Google Cloud Console
2. Remove old Supabase callback URL
3. Keep only new one

### Pause Old Supabase Project
1. Go to old project
2. **Settings** → **General** → **Pause project**
3. (Don't delete yet - keep as backup for 1-2 weeks)

---

## Troubleshooting

### Issue: "relation already exists" errors during import
**Solution**: This is normal - the script ignores these errors. The schema was already created.

### Issue: Auth users not imported
**Solution**: 
- Check if you said "yes" to importing auth users
- If users can't sign in, they can re-authenticate (data will be preserved by email matching)

### Issue: Sequences are wrong (duplicate key errors)
**Solution**: Run this in new database:
```sql
SELECT 'SELECT SETVAL(' ||
       quote_literal(quote_ident(schemaname) || '.' || quote_ident(sequencename)) ||
       ', COALESCE(MAX(' ||quote_ident(attname)|| '), 1) ) FROM ' ||
       quote_ident(schemaname)|| '.'||quote_ident(tablename)|| ';'
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_depend d ON d.refobjid = c.oid
JOIN pg_attribute a ON a.attrelid = d.refobjid AND a.attnum = d.refobjsubid
WHERE c.relkind = 'S'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'auth', 'storage');
```

### Issue: Storage files not migrated
**Solution**: Storage files need separate migration:
```bash
# Use Supabase CLI
supabase storage cp --recursive old-bucket new-bucket
```

---

## Rollback Plan

If something goes wrong:

1. **Keep old project running**
2. **Revert environment variables** to old project
3. **Redeploy** Railway with old variables
4. **Debug** the issue
5. **Try migration again** when ready

---

## Migration Checklist

- [ ] New Supabase project created
- [ ] Database connection strings obtained
- [ ] Migration script executed successfully
- [ ] Schema imported
- [ ] Data imported
- [ ] Auth users imported
- [ ] Google OAuth configured
- [ ] URL configuration set
- [ ] Google Cloud Console updated
- [ ] Local .env updated
- [ ] Tested locally
- [ ] Railway env vars updated
- [ ] Tested production
- [ ] Old project paused (after 1-2 weeks)

---

## Support

If you encounter issues:
1. Check the backup files in `supabase_backup_YYYYMMDD_HHMMSS/`
2. Review migration logs
3. Test queries directly in Supabase SQL Editor
4. Keep old project running until fully verified

---

**Migration script location**: `./migrate-supabase.sh`

**Backup location**: `./supabase_backup_YYYYMMDD_HHMMSS/`
