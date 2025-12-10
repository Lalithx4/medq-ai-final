# Migration Status: NextAuth → Supabase Auth

## ✅ Completed Changes

### 1. Core Authentication Files
- ✅ `src/lib/supabase/client.ts` - Browser Supabase client with SSR handling
- ✅ `src/lib/supabase/server.ts` - Server Supabase client
- ✅ `src/lib/auth/ensure-prisma-user.ts` - User sync with email matching
- ✅ `src/app/api/auth/logout/route.ts` - Logout endpoint
- ✅ `src/app/auth/callback/page.tsx` - OAuth callback handler
- ✅ `src/app/auth/login/page.tsx` - Login page with Google OAuth
- ✅ `src/middleware.ts` - Auth middleware using Supabase

### 2. Environment Configuration
- ✅ `src/env.js` - Updated with Supabase variables, removed NextAuth vars
- ✅ `.env` - New Supabase project credentials configured

### 3. Client Components Updated
- ✅ `src/app/layout.tsx` - Removed NextAuthProvider
- ✅ `src/components/home/AppLayout.tsx` - Using Supabase auth
- ✅ `src/components/auth/Dropdown.tsx` - Using Supabase auth

### 4. API Routes (61 files)
All API routes migrated to use `getServerSupabase()`:
- ✅ All `/api/chat/*` routes
- ✅ All `/api/credits/*` routes
- ✅ All `/api/deep-research/*` routes
- ✅ All `/api/editor/*` routes
- ✅ All `/api/files/*` routes
- ✅ All `/api/payment/*` routes
- ✅ All `/api/presentation/*` routes
- ✅ All `/api/research-paper/*` routes
- ✅ All `/api/subscription/*` routes
- ✅ All `/api/user/*` routes

### 5. Server Actions (7 files)
- ✅ `src/app/_actions/presentation/*` - All using Supabase
- ✅ `src/app/_actions/image/*` - All using Supabase

### 6. Database Migration
- ✅ Migrated from old Supabase project to new
- ✅ 14 tables migrated
- ✅ 5 users, 38 documents, 38 presentations, 27 transactions
- ✅ Schema and data verified

---

## ⚠️ Files to Delete (Not Used Anymore)

These files are old NextAuth files that are no longer used:

### Old Auth Pages
```bash
rm -rf src/app/auth/signin
rm -rf src/app/auth/signout
```

### Old Auth Provider
```bash
rm src/provider/NextAuthProvider.tsx
```

### Old Auth Config
```bash
rm src/server/auth.ts
```

---

## 🔧 Configuration Checklist

### Local Development (.env)
- ✅ `SUPABASE_URL` - Set to new project
- ✅ `SUPABASE_ANON_KEY` - Set to new project
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Set to new project
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Set to new project
- ✅ `DATABASE_URL` - Set to new project pooler
- ✅ `DIRECT_URL` - Set to new project pooler
- ⚠️ `NEXTAUTH_SECRET` - Can be removed (not used)
- ⚠️ `NEXTAUTH_URL` - Can be removed (not used)

### Supabase Dashboard Configuration
- ✅ Google OAuth provider enabled
- ✅ Google Client ID and Secret configured
- ✅ Site URL set to `https://www.biodocs.ai`
- ✅ Redirect URLs configured:
  - `https://www.biodocs.ai/auth/callback`
  - `http://localhost:3000/auth/callback`

### Google Cloud Console
- ✅ Authorized redirect URIs updated:
  - Old: `https://edxijcfybryqcffokimr.supabase.co/auth/v1/callback`
  - New: `https://vjkxwklusgjxcpddcwjl.supabase.co/auth/v1/callback`

---

## 🚀 Deployment Checklist

### Railway Environment Variables
Update these in Railway dashboard:

```bash
# Supabase
SUPABASE_URL=https://vjkxwklusgjxcpddcwjl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SUPABASE_URL=https://vjkxwklusgjxcpddcwjl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database
DATABASE_URL=postgresql://postgres.vjkxwklusgjxcpddcwjl:mimhid-4qAxky-dojzeb@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.vjkxwklusgjxcpddcwjl:mimhid-4qAxky-dojzeb@aws-1-ap-south-1.pooler.supabase.com:6543/postgres

# App URL
NEXT_PUBLIC_APP_URL=https://www.biodocs.ai

# Keep all other vars unchanged
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=...
# etc.
```

---

## 🧪 Testing Checklist

### Local Testing
- [ ] Kill existing dev server
- [ ] Clear `.next` build cache: `rm -rf .next`
- [ ] Start fresh: `pnpm dev`
- [ ] Visit `http://localhost:3000/auth/login`
- [ ] Click "Continue with Google"
- [ ] Complete OAuth flow
- [ ] Verify redirect to home page
- [ ] Check user profile in dropdown
- [ ] Test logout
- [ ] Verify all features work:
  - [ ] File upload
  - [ ] Presentation creation
  - [ ] Credits display
  - [ ] Settings page

### Production Testing (After Railway Deploy)
- [ ] Visit `https://www.biodocs.ai/auth/login`
- [ ] Sign in with Google
- [ ] Verify existing users see their data
- [ ] Test all critical features
- [ ] Monitor Railway logs for errors

---

## 📋 Known Issues & Solutions

### Issue: "Missing Supabase environment variables"
**Cause**: Client-side code can't access env vars during build
**Solution**: Already fixed in `src/lib/supabase/client.ts` with SSR detection

### Issue: Auth users count = 0
**Cause**: Auth users didn't migrate from old project
**Solution**: Not a problem - users will re-authenticate and be matched by email via `ensurePrismaUser()`

### Issue: Old signin/signout pages still exist
**Cause**: Leftover from NextAuth
**Solution**: Delete them (see "Files to Delete" section above)

---

## 🔄 User Experience After Migration

### For Existing Users
1. User visits app → redirected to `/auth/login`
2. Clicks "Continue with Google"
3. Completes Google OAuth (new Supabase Auth)
4. `ensurePrismaUser()` matches by email
5. User sees all their existing data (presentations, files, credits)
6. ✅ Seamless experience!

### For New Users
1. User visits app → redirected to `/auth/login`
2. Clicks "Continue with Google"
3. Completes Google OAuth
4. `ensurePrismaUser()` creates new user in Prisma
5. User starts fresh with default credits
6. ✅ Normal signup flow!

---

## 📊 Migration Verification

Run this to verify migration:
```bash
./check-migration.sh
```

Expected output:
- 14 tables in public schema
- 5 users
- 38 documents
- 38 presentations
- 27 credit transactions

---

## 🎯 Next Steps

1. **Clean up old files** (optional but recommended):
   ```bash
   rm -rf src/app/auth/signin src/app/auth/signout
   rm src/provider/NextAuthProvider.tsx
   rm src/server/auth.ts
   ```

2. **Test locally**:
   ```bash
   rm -rf .next
   pnpm dev
   ```

3. **Update Railway env vars** (see Deployment Checklist above)

4. **Deploy to Railway**:
   ```bash
   git push origin new_auth
   ```

5. **Test production** after deployment

6. **Pause old Supabase project** (after 1-2 weeks of verification)

---

## 📞 Support

If issues arise:
1. Check Railway logs
2. Check browser console for errors
3. Verify env vars are set correctly
4. Test Supabase connection in SQL Editor
5. Review this document for missed steps

---

**Migration completed on**: 2025-10-23
**Old Supabase Project**: edxijcfybryqcffokimr
**New Supabase Project**: vjkxwklusgjxcpddcwjl
**Status**: ✅ Ready for testing and deployment
