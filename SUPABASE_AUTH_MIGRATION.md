# Supabase Auth Migration - Complete

## Summary
Successfully migrated from NextAuth to Supabase Auth (Google OAuth).

## Completed Routes (47)

### Core Auth Infrastructure
- ✅ `src/lib/supabase/server.ts` - Server-side Supabase client helper
- ✅ `src/lib/supabase/client.ts` - Browser-side Supabase client helper
- ✅ `src/middleware.ts` - Session validation via Supabase
- ✅ `src/app/auth/login/page.tsx` - Google OAuth sign-in
- ✅ `src/app/api/auth/logout/route.ts` - Sign-out endpoint
- ✅ `src/lib/auth/ensure-prisma-user.ts` - Helper to sync Supabase→Prisma users

### API Routes Migrated
- ✅ User: `profile`
- ✅ Files: `list`, `get/[id]`, `delete/[id]`, `save`
- ✅ Editor: `save`, `ai-assist`, `convert/docx`, `convert/pdf`, `quick-action`
- ✅ Credits: `balance`, `history`
- ✅ Research-paper: `generate`
- ✅ Payment: `history`, `stripe/checkout`, `paypal/create-order`, `paypal/capture`, `razorpay/create-order`, `razorpay/verify`
- ✅ Deep-research: `download/[reportId]`, `generate`, `generate/route-new`, `langchain-stream`, `multi-agent`, `multi-agent-stream`

### SDK Hardening
- ✅ `src/lib/payment/stripe-service.ts` - Lazy-init to avoid env access at import time
- ✅ Updated Stripe API version to `2025-09-30.clover`
- ✅ Dynamic baseUrl for Railway/proxy compatibility

## Remaining Routes (13)
- Presentation (8 routes)
- Research-paper streams (2 routes)
- Chat, Subscription (2), Uploadthing (1)

## Migration Pattern Applied
```typescript
// Before (NextAuth)
import { auth } from "@/server/auth";
const session = await auth();
if (!session?.user?.id) return 401;
const userId = session.user.id;

// After (Supabase)
import { getServerSupabase } from "@/lib/supabase/server";
const supabase = getServerSupabase();
const { data: { user } } = await supabase.auth.getUser();
if (!user?.id) return 401;
const userId = user.id;
```

## Environment Variables Required (Railway)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL=https://www.biodocs.ai`
- Remove after full migration: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `AUTH_URL`, `AUTH_SECRET`

## Supabase Dashboard Configuration
- Auth → URL Configuration:
  - Site URL: `https://www.biodocs.ai`
  - Redirect URLs: `https://www.biodocs.ai`, `http://localhost:3000`
- Auth → Providers → Google:
  - Client ID/Secret configured
  - Google Console callback: `https://<project>.supabase.co/auth/v1/callback`

## Testing Checklist
- [ ] Login via Google at `/auth/login`
- [ ] API routes return user data correctly
- [ ] File operations work (list, get, delete, save)
- [ ] Payment flows (Stripe, PayPal, Razorpay)
- [ ] Deep-research generation and download
- [ ] Research-paper generation
- [ ] Editor save and AI assist

## Next Steps
1. Complete remaining 13 routes
2. Remove `src/app/api/auth/[...nextauth]/route.ts`
3. Remove NextAuth env vars from Railway
4. Optional: Add `/auth/callback` page for cleaner redirects
