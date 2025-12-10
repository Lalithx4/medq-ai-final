# Fix: Localhost Redirect Issue

## Problem
After Google OAuth login, the app redirects to `https://localhost:8080/presentation/auth/callback` instead of `https://www.biodocs.ai/auth/callback`.

## Root Cause
Your **Supabase Authentication Settings** have the wrong Site URL or Redirect URLs configured.

---

## Solution: Update Supabase Auth Configuration

### Step 1: Go to Supabase Dashboard

1. Visit [supabase.com](https://supabase.com/dashboard)
2. Select your project: `vjkxwklusgjxcpddcwjl`
3. Go to **Authentication** → **URL Configuration**

### Step 2: Update Site URL

Set the **Site URL** to:
```
https://www.biodocs.ai
```

**Important**: 
- Use `https://www.biodocs.ai` (with `www`)
- No trailing slash
- This is the base URL users will be redirected to after authentication

### Step 3: Update Redirect URLs

In the **Redirect URLs** section, add these URLs (one per line):

```
https://www.biodocs.ai/auth/callback
https://www.biodocs.ai/*
http://localhost:3000/auth/callback
http://localhost:3000/*
```

**Remove any localhost:8080 URLs** if present.

**Explanation**:
- `https://www.biodocs.ai/auth/callback` - Production OAuth callback
- `https://www.biodocs.ai/*` - Allow any production path (for deep links)
- `http://localhost:3000/auth/callback` - Local development callback
- `http://localhost:3000/*` - Allow any local path

### Step 4: Save Changes

Click **Save** at the bottom of the page.

---

## Verify the Fix

### Test 1: Check Current Configuration

Run this command to see what Supabase thinks is your site URL:

```bash
curl -s "https://vjkxwklusgjxcpddcwjl.supabase.co/auth/v1/settings" | jq '.'
```

Look for:
- `"external_url"` - should be `https://www.biodocs.ai`
- `"redirect_urls"` - should include your production URLs

### Test 2: Try Login Again

1. Clear browser cookies for `www.biodocs.ai`
2. Visit `https://www.biodocs.ai/auth/login`
3. Click "Continue with Google"
4. Complete OAuth
5. You should be redirected to `https://www.biodocs.ai/auth/callback` (not localhost)

---

## Additional Checks

### Check Railway Environment Variables

Ensure `NEXT_PUBLIC_APP_URL` is set correctly in Railway:

```bash
NEXT_PUBLIC_APP_URL=https://www.biodocs.ai
```

### Check Google OAuth Configuration

In Google Cloud Console:

1. Go to **APIs & Services** → **Credentials**
2. Find your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, ensure you have:
   ```
   https://vjkxwklusgjxcpddcwjl.supabase.co/auth/v1/callback
   ```

---

## Why This Happened

The redirect to `localhost:8080` suggests:
- Supabase Site URL was set to `http://localhost:8080` or similar
- OR the Redirect URLs whitelist didn't include your production domain
- Supabase defaults to the configured Site URL when the requested redirect isn't whitelisted

---

## Common Mistakes to Avoid

❌ **Wrong**: `http://www.biodocs.ai` (missing https)
❌ **Wrong**: `https://www.biodocs.ai/` (trailing slash)
❌ **Wrong**: `https://biodocs.ai` (missing www, if you use www)
✅ **Correct**: `https://www.biodocs.ai`

❌ **Wrong**: Redirect URL = `https://www.biodocs.ai/auth/callback/`
✅ **Correct**: Redirect URL = `https://www.biodocs.ai/auth/callback`

---

## Test Script

After making changes, run this to verify:

```bash
# Check Supabase settings
curl -s "https://vjkxwklusgjxcpddcwjl.supabase.co/auth/v1/settings" | jq '.external_url, .redirect_urls'

# Should output:
# "https://www.biodocs.ai"
# ["https://www.biodocs.ai/auth/callback", "https://www.biodocs.ai/*", ...]
```

---

## Summary

1. ✅ Go to Supabase Dashboard → Authentication → URL Configuration
2. ✅ Set Site URL to: `https://www.biodocs.ai`
3. ✅ Add Redirect URLs:
   - `https://www.biodocs.ai/auth/callback`
   - `https://www.biodocs.ai/*`
4. ✅ Remove any `localhost:8080` URLs
5. ✅ Save changes
6. ✅ Test login again

After this, OAuth should redirect to your production domain correctly.
