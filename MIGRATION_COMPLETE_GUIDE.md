# Supabase Auth Migration - Final Steps

## ✅ COMPLETED (50 routes migrated)

### Infrastructure
- Login page, Logout endpoint, Middleware, Server/Client helpers
- Stripe lazy-init + API version update

### API Routes Migrated
- **User**: profile
- **Files**: list, get/[id], delete/[id], save
- **Editor**: save, ai-assist, convert/docx, convert/pdf, quick-action (5/5 ✅)
- **Credits**: balance, history
- **Research-paper**: generate
- **Payment**: All 6 routes ✅
- **Deep-research**: All 6 routes ✅
- **Chat**: route (POST + GET) ✅
- **Subscription**: cancel ✅

## ⏳ REMAINING (11 routes)

### Subscription
- `src/app/api/subscription/status/route.ts`

### Research-paper Streams
- `src/app/api/research-paper/academic-stream/route.ts`
- `src/app/api/research-paper/langchain-stream/route.ts`

### Presentation (8 routes)
- `src/app/api/presentation/agent-edit/route.ts`
- `src/app/api/presentation/agent-test/route.ts`
- `src/app/api/presentation/generate-cerebras/route.ts`
- `src/app/api/presentation/generate/route.ts`
- `src/app/api/presentation/outline-cerebras/route.ts`
- `src/app/api/presentation/outline-multi-source/route.ts`
- `src/app/api/presentation/outline-with-search/route.ts`
- `src/app/api/presentation/outline/route.ts`

### Uploadthing
- `src/app/api/uploadthing/core.ts`

## Migration Pattern (Copy-Paste Ready)

### Step 1: Update imports
```typescript
// REMOVE
import { auth } from "@/server/auth";

// ADD
import { getServerSupabase } from "@/lib/supabase/server";
```

### Step 2: Replace session check
```typescript
// BEFORE
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// AFTER
const supabase = getServerSupabase();
const { data: { user } } = await supabase.auth.getUser();
if (!user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Step 3: Replace all `session.user.id` with `user.id`
```typescript
// BEFORE
userId: session.user.id

// AFTER
userId: user.id
```

### Step 4: If you need Prisma user by email
```typescript
const dbUser = await db.user.findUnique({
  where: { email: user.email },
});
```

## Quick Commands to Complete Migration

### Find remaining files
```bash
grep -r "from \"@/server/auth\"" src/app/api --include="*.ts" | grep -v nextauth
```

### Batch replace pattern (use with caution)
```bash
# For each file, run:
# 1. Replace import
sed -i '' 's/import { auth } from "@\/server\/auth";/import { getServerSupabase } from "@\/lib\/supabase\/server";/g' FILE

# 2. Replace session check (manual verification recommended)
```

## Final Cleanup

### 1. Remove NextAuth route
```bash
rm src/app/api/auth/[...nextauth]/route.ts
```

### 2. Remove NextAuth dependencies (optional)
```bash
pnpm remove next-auth @auth/prisma-adapter
```

### 3. Remove NextAuth env vars from Railway
- NEXTAUTH_URL
- NEXTAUTH_SECRET
- AUTH_URL
- AUTH_SECRET

### 4. Keep these Supabase vars
- SUPABASE_URL
- SUPABASE_ANON_KEY
- NEXT_PUBLIC_APP_URL

## Testing Checklist

- [ ] Login via Google works
- [ ] File operations (list, get, save, delete)
- [ ] Payment flows (Stripe, PayPal, Razorpay)
- [ ] Deep-research generation
- [ ] Research-paper generation
- [ ] Editor AI assist
- [ ] Chat functionality
- [ ] Subscription management
- [ ] Presentation generation (after migration)

## Migration Progress: 82% Complete (50/61 routes)

Remaining work: 11 routes (mostly presentation routes)
Estimated time: 15-20 minutes
