# 🚀 Supabase Quick Start - 5 Minutes Setup

## What You're Getting

✅ **All data in Supabase** - Database + File Storage
✅ **Chat history saved** - Never lose conversations
✅ **Cloud file storage** - No local files
✅ **100% FREE tier** - 500MB DB + 1GB Storage

---

## Step 1: Create Supabase Account (2 minutes)

1. Go to **https://supabase.com**
2. Click **"Start your project"**
3. Sign up with **GitHub** (easiest)
4. Click **"New Project"**
5. Fill in:
   - **Name**: `biodocs-ai`
   - **Password**: Generate strong password ⚠️ **SAVE THIS!**
   - **Region**: Choose closest to you
6. Click **"Create new project"** (wait ~2 minutes)

---

## Step 2: Get Your Credentials (1 minute)

### A. API Keys
1. In Supabase Dashboard → **Settings** (⚙️) → **API**
2. Copy these:
   ```
   Project URL: https://xxxxx.supabase.co
   anon public: eyJhbGc... (long key)
   ```

### B. Database URL
1. **Settings** → **Database** → **Connection String**
2. Select **"URI"** tab
3. Copy the string
4. Replace `[YOUR-PASSWORD]` with your database password

---

## Step 3: Create Storage Bucket (30 seconds)

1. In Supabase Dashboard → **Storage**
2. Click **"New bucket"**
3. Name: `research-files`
4. ✅ Check **"Public bucket"**
5. Click **"Create bucket"**

---

## Step 4: Configure Your App (1 minute)

1. Copy `env-template.txt` to `.env`
2. Update these values:

```env
# SUPABASE
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="eyJhbGc..."

# DATABASE (from Step 2B)
DATABASE_URL="postgresql://postgres.xxxxx:YOUR-PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgresql://postgres.xxxxx:YOUR-PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres"

# NEXTAUTH (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-generated-secret"
NEXTAUTH_URL="http://localhost:3000"

# GOOGLE OAUTH (get from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI PROVIDERS
CEREBRAS_API_KEY="csk-your-key"
OPENAI_API_KEY="sk-your-key"
```

---

## Step 5: Run Setup Script (1 minute)

### Windows:
```powershell
.\setup-supabase.ps1
```

### Mac/Linux:
```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm prisma generate

# Push database schema
pnpm db:push
```

---

## Step 6: Start Your App

```bash
pnpm dev
```

Open **http://localhost:3000** 🎉

---

## ✅ Verify Everything Works

### Test 1: Chat Saves
1. Go to home page
2. Send a message
3. Check Supabase Dashboard → **Table Editor** → `ChatMessage`
4. ✅ Should see your message

### Test 2: Files Upload
1. Generate a research report
2. Check Supabase Dashboard → **Storage** → `research-files`
3. ✅ Should see the file

### Test 3: Database
```bash
pnpm prisma studio
```
✅ Should see all tables including `ChatConversation` and `ChatMessage`

---

## 🆘 Common Issues

### "SUPABASE_URL is not set"
→ Add it to `.env` file

### "Bucket does not exist"
→ Create `research-files` bucket in Supabase Storage (Step 3)

### "Database connection failed"
→ Check password in `DATABASE_URL` is correct

### "Property 'chatConversation' does not exist"
→ Run: `pnpm prisma generate`

---

## 📊 What's Stored Where

| Data Type | Location | Example |
|-----------|----------|---------|
| **User accounts** | Supabase PostgreSQL | `User` table |
| **Chat messages** | Supabase PostgreSQL | `ChatMessage` table |
| **Research files** | Supabase Storage | `research-files/deep-research/` |
| **Presentations** | Supabase PostgreSQL | `Presentation` table |
| **Documents** | Supabase PostgreSQL | `Document` table |

**Everything is in Supabase!** 🎯

---

## 🎓 What Changed

### Before:
- ❌ Chat not saved (lost on refresh)
- ❌ Files on local disk
- ❌ Mixed storage locations

### After:
- ✅ Chat history persisted
- ✅ Files in cloud storage
- ✅ Everything in Supabase

---

## 📚 Full Documentation

See `SUPABASE_MIGRATION_COMPLETE.md` for:
- Detailed API documentation
- Advanced features
- Troubleshooting guide
- Code examples

---

## 💡 Free Tier Limits

- **Database**: 500 MB
- **Storage**: 1 GB  
- **Bandwidth**: 2 GB/month
- **API Requests**: Unlimited

**Perfect for development and small projects!**

---

## 🎉 You're Done!

Your app now:
- ✅ Saves all chats to database
- ✅ Stores files in Supabase Storage
- ✅ Uses Supabase PostgreSQL for everything
- ✅ Has full chat history
- ✅ Is 100% cloud-based

**No more local files. Everything in Supabase!** 🚀
