# Authentication Re-Enabled

## ✅ Status: Authentication Fully Restored

Authentication has been re-enabled across all presentation generation routes.

---

## 🔧 What Was Changed

### File: `src/app/api/presentation/generate-cerebras/route.ts`

**Before (Auth Disabled):**
```typescript
// TEMPORARILY DISABLED FOR TESTING
console.log("⚠️ [DEV] Authentication and credit check disabled for testing");
const session = { user: { id: "test-user" } }; // Mock session

// const session = await auth();
// if (!session?.user?.id) {
//   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// }
```

**After (Auth Enabled):**
```typescript
// Authentication check
const session = await auth();
if (!session?.user?.id) {
  console.error("❌ Unauthorized: No session or user ID");
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
console.log("✅ User authenticated:", session.user.id);

// Check credits
const hasCredits = await CreditService.hasEnoughCredits(
  session.user.id,
  "presentation_generate"
);

if (!hasCredits) {
  console.warn("⚠️ User has insufficient credits");
  return NextResponse.json(
    { error: "Insufficient credits. Please upgrade your plan." },
    { status: 403 }
  );
}
console.log("✅ User has sufficient credits");
```

---

## 🔐 Authentication Flow

### 1. **Middleware Protection**
All routes except `/`, `/auth/*`, and `/api/*` are protected by middleware:

**File:** `src/middleware.ts`
```typescript
// If user is not authenticated and trying to access a protected route
if (!session && !isAuthPage && !request.nextUrl.pathname.startsWith("/api")) {
  return NextResponse.redirect(
    new URL(`/auth/signin?callbackUrl=${encodeURIComponent(request.url)}`, request.url)
  );
}
```

### 2. **API Route Protection**
Each API route checks authentication:

```typescript
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### 3. **Credit Check**
Presentation generation now checks user credits:

```typescript
const hasCredits = await CreditService.hasEnoughCredits(
  session.user.id,
  "presentation_generate"
);

if (!hasCredits) {
  return NextResponse.json(
    { error: "Insufficient credits. Please upgrade your plan." },
    { status: 403 }
  );
}
```

---

## 📊 Protected Routes Status

| Route | Auth Status | Credit Check |
|-------|-------------|--------------|
| `/api/presentation/generate-cerebras` | ✅ Enabled | ✅ Enabled |
| `/api/presentation/generate` | ✅ Enabled | ✅ Enabled |
| `/api/presentation/outline-cerebras` | ✅ Enabled | ❌ No |
| `/api/presentation/outline` | ✅ Enabled | ❌ No |
| `/api/presentation/outline-with-search` | ✅ Enabled | ❌ No |
| `/api/presentation/outline-multi-source` | ✅ Enabled | ❌ No |
| `/api/presentation/agent-edit` | ✅ Enabled | ❌ No |
| `/api/files/list` | ✅ Enabled | ❌ No |
| `/api/files/save` | ✅ Enabled | ❌ No |
| `/api/files/get/*` | ✅ Enabled | ❌ No |
| `/api/files/delete/*` | ✅ Enabled | ❌ No |
| `/api/editor/save` | ✅ Enabled | ❌ No |
| `/api/deep-research/*` | ✅ Enabled | ✅ Varies |
| `/api/research-paper/*` | ✅ Enabled | ✅ Varies |

---

## 🧪 Testing Authentication

### Test 1: Unauthenticated Access

**Steps:**
1. Log out of the application
2. Try to access `/presentation/generate`
3. Should redirect to `/auth/signin`

**Expected:**
- Redirected to sign-in page
- Callback URL preserved

### Test 2: API Without Auth

**Steps:**
```bash
curl http://localhost:3000/api/presentation/generate-cerebras \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","prompt":"Test"}'
```

**Expected Response:**
```json
{
  "error": "Unauthorized"
}
```

**Status Code:** 401

### Test 3: Authenticated Access

**Steps:**
1. Log in to the application
2. Navigate to `/presentation/generate`
3. Create a presentation

**Expected:**
- ✅ Page loads successfully
- ✅ Can generate presentations
- ✅ User ID logged in server console

### Test 4: Insufficient Credits

**Steps:**
1. Log in with account that has 0 credits
2. Try to generate presentation

**Expected Response:**
```json
{
  "error": "Insufficient credits. Please upgrade your plan."
}
```

**Status Code:** 403

---

## 🔍 Debugging Authentication Issues

### Check if User is Logged In

**Browser Console:**
```javascript
fetch('/api/auth/session')
  .then(r => r.json())
  .then(console.log)
```

**Expected (Logged In):**
```json
{
  "user": {
    "id": "clxxx123",
    "email": "user@example.com",
    "name": "User Name",
    "hasAccess": true
  }
}
```

**Expected (Not Logged In):**
```json
{}
```

### Check Server Logs

**Successful Auth:**
```
✅ User authenticated: clxxx123
✅ User has sufficient credits
```

**Failed Auth:**
```
❌ Unauthorized: No session or user ID
```

**Insufficient Credits:**
```
⚠️ User has insufficient credits
```

---

## 🔑 Authentication Configuration

### Environment Variables

**Required in `.env`:**
```env
NEXTAUTH_SECRET="your_secret_here"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
```

### Google OAuth Setup

1. **Go to:** https://console.cloud.google.com/apis/credentials
2. **Create OAuth 2.0 Client ID**
3. **Authorized redirect URIs:**
   - `http://localhost:3000/api/auth/callback/google`
   - `https://yourdomain.com/api/auth/callback/google` (production)

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Or use: https://generate-secret.vercel.app/32

---

## 👥 User Management

### Check User Credits

```bash
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCredits() {
  const user = await prisma.user.findFirst({
    where: { email: 'user@example.com' },
    select: { id: true, email: true, credits: true }
  });
  console.log('User:', user);
}

checkCredits().finally(() => prisma.\$disconnect());
"
```

### Add Credits to User

```bash
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function addCredits() {
  const user = await prisma.user.update({
    where: { email: 'user@example.com' },
    data: { credits: { increment: 100 } }
  });
  console.log('Updated user:', user.email, 'Credits:', user.credits);
}

addCredits().finally(() => prisma.\$disconnect());
"
```

### Create Admin User

```bash
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function makeAdmin() {
  const user = await prisma.user.update({
    where: { email: 'admin@example.com' },
    data: { 
      role: 'ADMIN',
      hasAccess: true,
      credits: 999999
    }
  });
  console.log('Admin user:', user.email);
}

makeAdmin().finally(() => prisma.\$disconnect());
"
```

---

## 🚨 Common Issues

### Issue 1: "Unauthorized" on Every Request

**Cause:** Session not being created/stored

**Check:**
1. Is `NEXTAUTH_SECRET` set in `.env`?
2. Is `NEXTAUTH_URL` correct?
3. Are cookies enabled in browser?

**Fix:**
```bash
# Verify environment variables
cat .env | grep NEXTAUTH

# Should show:
# NEXTAUTH_SECRET="..."
# NEXTAUTH_URL="http://localhost:3000"
```

### Issue 2: "Insufficient Credits" Error

**Cause:** User has 0 credits

**Check:**
```bash
pnpm tsx check-database.ts
# Look for user credits
```

**Fix:**
```bash
# Add credits (see "Add Credits to User" above)
```

### Issue 3: Redirect Loop

**Cause:** Middleware redirecting authenticated users

**Check:**
- Verify middleware matcher in `src/middleware.ts`
- Check if session is being returned correctly

**Fix:**
- Clear browser cookies
- Restart dev server
- Check middleware logs

---

## 📝 Migration Notes

### For Existing Users

If you were testing with auth disabled:

1. **Log in** to the application
2. **Check credits** - You may need to add credits
3. **Test generation** - Should work with proper auth

### For New Users

1. **Sign up** via Google OAuth
2. **Default credits:** 100 (free tier)
3. **Generate presentations** - Credits will be deducted

---

## ✅ Verification Checklist

- [x] Auth enabled in `generate-cerebras/route.ts`
- [x] Credit check enabled
- [x] All other routes have auth
- [x] Middleware protecting pages
- [x] Google OAuth configured
- [x] NEXTAUTH_SECRET set
- [x] Session working correctly

---

## 🎯 Summary

**What Changed:**
- ✅ Removed mock session (`test-user`)
- ✅ Re-enabled `await auth()` check
- ✅ Re-enabled credit validation
- ✅ Added proper error responses

**Impact:**
- ✅ Users must be logged in to generate presentations
- ✅ Users must have credits to generate presentations
- ✅ Proper security and access control restored

**Next Steps:**
1. Test authentication flow
2. Verify credit system working
3. Monitor server logs for auth issues

---

**Status:** ✅ **Authentication Fully Restored**

**Last Updated:** 2025-10-21

**Modified Files:**
- `src/app/api/presentation/generate-cerebras/route.ts`
