# Files Fetch Debugging Guide

## 🔍 Issue: Documents Not Showing in Files Dashboard

### Current Status
✅ Documents ARE being saved to Supabase (PostgreSQL) database
❓ Documents MAY NOT be displaying in the UI

---

## 🛠️ What I Fixed

### 1. Added Comprehensive Logging

**API Endpoint** (`/api/files/list/route.ts`):
```typescript
console.log("📂 [FILES/LIST] Fetching files...");
console.log("✅ [FILES/LIST] User authenticated:", session.user.email);
console.log("✅ [FILES/LIST] User found:", user.id);
console.log(`📄 [FILES/LIST] Found ${documents.length} documents`);
console.log(`🔬 [FILES/LIST] Found ${researchReports.length} research reports`);
console.log(`✅ [FILES/LIST] Returning ${files.length} total files`);
```

**Frontend** (`FilesDashboard.tsx`):
```typescript
console.log("📂 Fetching files from database...");
console.log("✅ Files fetched successfully:", data.files?.length || 0, "files");
console.error("❌ Failed to fetch files:", data.error);
```

### 2. Better Error Handling

- ✅ Check for authentication errors
- ✅ Check for API response errors
- ✅ Display meaningful error messages
- ✅ Set empty array on error (prevents UI crash)

---

## 🧪 How to Debug

### Step 1: Check if User is Logged In

1. Open browser console (F12)
2. Go to `/files` page
3. Look for these logs:

**✅ Success:**
```
📂 Fetching files from database...
✅ Files fetched successfully: 50 files
```

**❌ Not Logged In:**
```
📂 Fetching files from database...
❌ Failed to fetch files: Unauthorized
❌ User not authenticated. Please log in.
```

**Solution:** Log in to the application

---

### Step 2: Check Server Logs

1. Open terminal where `pnpm dev` is running
2. Navigate to `/files` page
3. Look for these logs:

**✅ Success:**
```
📂 [FILES/LIST] Fetching files...
✅ [FILES/LIST] User authenticated: user@example.com
✅ [FILES/LIST] User found: clxxx123
📄 [FILES/LIST] Found 50 documents
🔬 [FILES/LIST] Found 22 research reports
✅ [FILES/LIST] Returning 72 total files
```

**❌ No User:**
```
📂 [FILES/LIST] Fetching files...
❌ [FILES/LIST] Unauthorized - no session
```

**❌ User Not in DB:**
```
📂 [FILES/LIST] Fetching files...
✅ [FILES/LIST] User authenticated: user@example.com
❌ [FILES/LIST] User not found in database
```

---

### Step 3: Check Database Directly

Run the verification script:
```bash
pnpm tsx check-database.ts
```

**Expected Output:**
```
📄 Documents:
   Total: 50
   Recent:
   - LIVER CIRRHOSIS [deep-research] (10/21/2025, 12:35:04 PM)
   - Brain Surgery Research [deep-research] (10/21/2025, 12:21:45 PM)

🔬 Deep Research Reports:
   Total: 22
   Recent:
   - LIVER CIRRHOSIS [completed] (3157 words)
   - Brain Surgery [completed] (3217 words)
```

---

### Step 4: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to `/files` page
4. Look for `/api/files/list` request

**✅ Success (Status 200):**
```json
{
  "success": true,
  "files": [
    {
      "id": "clxxx123",
      "title": "LIVER CIRRHOSIS",
      "type": "deep-research",
      "createdAt": "2025-10-21T07:05:04.000Z",
      "size": "~16 KB"
    },
    ...
  ]
}
```

**❌ Unauthorized (Status 401):**
```json
{
  "error": "Unauthorized"
}
```

**❌ Error (Status 500):**
```json
{
  "error": "Failed to fetch files"
}
```

---

## 🔧 Common Issues & Solutions

### Issue 1: "Unauthorized" Error

**Symptoms:**
- Browser console shows: `❌ Failed to fetch files: Unauthorized`
- Network tab shows 401 status

**Cause:** User is not logged in

**Solution:**
1. Go to `/auth/signin`
2. Log in with your credentials
3. Return to `/files` page

---

### Issue 2: "User not found" Error

**Symptoms:**
- Server logs show: `❌ [FILES/LIST] User not found in database`
- Network tab shows 404 status

**Cause:** User exists in NextAuth but not in database

**Solution:**
```bash
# Check if user exists
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findMany({ select: { id: true, email: true } })
  .then(users => console.log('Users:', users))
  .finally(() => prisma.\$disconnect());
"
```

If user doesn't exist, sign up again or create user manually.

---

### Issue 3: Files Exist but Not Showing

**Symptoms:**
- Database has documents (verified with `check-database.ts`)
- API returns files successfully
- UI still shows empty

**Possible Causes:**

**A. Wrong User ID:**
```bash
# Check which user owns the documents
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.document.findMany({ 
  select: { userId: true, title: true },
  take: 5 
})
  .then(docs => console.log('Documents:', docs))
  .finally(() => prisma.\$disconnect());
"
```

**B. Frontend Not Rendering:**
Check browser console for React errors

**C. CSS Hiding Elements:**
Check if elements exist in DOM but are hidden

---

### Issue 4: Database Connection Error

**Symptoms:**
- Server logs show Prisma errors
- 500 status in network tab

**Check Database Connection:**
```bash
# Test connection
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => console.log('✅ Connected'))
  .catch(e => console.error('❌ Error:', e))
  .finally(() => prisma.\$disconnect());
"
```

**Check .env file:**
```bash
cat .env | grep DATABASE_URL
```

Should show:
```
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

---

## 📊 Expected Data Flow

```
User visits /files page
    ↓
FilesDashboard component mounts
    ↓
useEffect calls fetchFiles()
    ↓
Fetch /api/files/list
    ↓
Check authentication (NextAuth session)
    ↓
Get user from database
    ↓
Query Document table (userId = user.id)
    ↓
Query DeepResearchReport table (userId = user.id)
    ↓
Combine and format results
    ↓
Return JSON with files array
    ↓
Frontend receives data
    ↓
setFiles(data.files)
    ↓
UI renders file list
```

---

## 🎯 Quick Verification Checklist

Run through this checklist:

### Database
- [ ] Run `pnpm tsx check-database.ts`
- [ ] Verify documents exist: `📄 Documents: Total: 50`
- [ ] Verify research reports exist: `🔬 Deep Research Reports: Total: 22`

### Authentication
- [ ] User is logged in
- [ ] Check browser console for auth errors
- [ ] Check `/api/auth/session` returns user data

### API Endpoint
- [ ] Server is running (`pnpm dev`)
- [ ] Navigate to `/files` page
- [ ] Check server logs for `📂 [FILES/LIST] Fetching files...`
- [ ] Check server logs for `✅ [FILES/LIST] Returning X total files`

### Frontend
- [ ] Browser console shows `📂 Fetching files from database...`
- [ ] Browser console shows `✅ Files fetched successfully: X files`
- [ ] Network tab shows `/api/files/list` with status 200
- [ ] Response contains `files` array with data

### UI
- [ ] Files dashboard page loads without errors
- [ ] File list is visible (not hidden by CSS)
- [ ] Files are rendered in the list

---

## 🔬 Advanced Debugging

### Enable Prisma Query Logs

Already enabled in `src/server/db.ts`:
```typescript
log: ["query", "info", "warn", "error"]
```

You'll see all SQL queries in server console:
```
prisma:query SELECT * FROM "Document" WHERE "userId" = $1
prisma:query SELECT * FROM "DeepResearchReport" WHERE "userId" = $1
```

### Check Specific User's Files

```bash
pnpm tsx -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.user.findFirst({
    where: { email: 'YOUR_EMAIL_HERE' }
  });
  
  if (!user) {
    console.log('❌ User not found');
    return;
  }
  
  console.log('✅ User:', user.id, user.email);
  
  const docs = await prisma.document.findMany({
    where: { userId: user.id },
    select: { id: true, title: true, type: true }
  });
  
  console.log('📄 Documents:', docs.length);
  docs.forEach(d => console.log('  -', d.title, `[${d.type}]`));
  
  const reports = await prisma.deepResearchReport.findMany({
    where: { userId: user.id },
    select: { id: true, topic: true }
  });
  
  console.log('🔬 Research Reports:', reports.length);
  reports.forEach(r => console.log('  -', r.topic));
}

check().finally(() => prisma.\$disconnect());
"
```

---

## 📝 Testing Steps

### Test 1: Create and Fetch Document

1. **Create a document:**
   - Go to `/editor` page
   - Type some content
   - Click "Save"
   - Check console for "✅ Document saved successfully"

2. **Fetch documents:**
   - Go to `/files` page
   - Check console for "✅ Files fetched successfully"
   - Verify your document appears in the list

### Test 2: Create and Fetch Research Report

1. **Create a research report:**
   - Go to deep research page
   - Generate a report
   - Wait for completion

2. **Fetch reports:**
   - Go to `/files` page
   - Verify report appears in the list

---

## 🚨 If Nothing Works

### Last Resort Debugging

1. **Check if API is even being called:**
```typescript
// Add to FilesDashboard.tsx fetchFiles()
console.log("🔍 About to fetch...");
const response = await fetch("/api/files/list");
console.log("🔍 Response status:", response.status);
console.log("🔍 Response headers:", response.headers);
const data = await response.json();
console.log("🔍 Response data:", data);
```

2. **Check if component is rendering:**
```typescript
// Add to FilesDashboard component
console.log("🔍 Component rendered, files:", files);
console.log("🔍 isLoading:", isLoading);
console.log("🔍 filteredFiles:", filteredFiles);
```

3. **Check database directly:**
```bash
# Connect to Supabase
psql "postgresql://postgres.edxijcfybryqcffokimr:Tspl@9603044@aws-1-us-east-1.pooler.supabase.com:5432/postgres"

# Run queries
SELECT COUNT(*) FROM "Document";
SELECT id, title, type FROM "Document" LIMIT 5;
SELECT COUNT(*) FROM "DeepResearchReport";
```

---

## ✅ Success Indicators

You'll know it's working when you see:

**Browser Console:**
```
📂 Fetching files from database...
✅ Files fetched successfully: 72 files
```

**Server Console:**
```
📂 [FILES/LIST] Fetching files...
✅ [FILES/LIST] User authenticated: user@example.com
✅ [FILES/LIST] User found: clxxx123
📄 [FILES/LIST] Found 50 documents
🔬 [FILES/LIST] Found 22 research reports
✅ [FILES/LIST] Returning 72 total files
```

**UI:**
- Files list populated with documents
- Each file shows title, type, date
- Can click to view/download

---

## 📞 Need More Help?

1. **Check server logs** - Most issues show up there
2. **Check browser console** - Frontend errors appear here
3. **Run `check-database.ts`** - Verify data exists
4. **Check Network tab** - See actual API responses
5. **Enable Prisma logs** - Already enabled, check server console

---

**Status:** ✅ Logging added, ready for debugging

**Next Step:** Navigate to `/files` page and check console logs

**Last Updated:** 2025-10-21
