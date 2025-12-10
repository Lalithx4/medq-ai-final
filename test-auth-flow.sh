#!/bin/bash

# Comprehensive Auth Flow Test Script
# Tests the complete authentication and credits balance flow

set -e

PROD_URL="https://www.biodocs.ai"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔐 Testing Auth Flow on Railway Deployment"
echo "=========================================="
echo ""

# Test 1: Check if env vars are available
echo -e "${BLUE}Test 1: Environment Variables${NC}"
echo "Checking /api/public-env..."
ENV_RESPONSE=$(curl -s "$PROD_URL/api/public-env")
echo "$ENV_RESPONSE" | jq '.' 2>/dev/null || echo "$ENV_RESPONSE"

SUPABASE_URL=$(echo "$ENV_RESPONSE" | jq -r '.NEXT_PUBLIC_SUPABASE_URL' 2>/dev/null || echo "")
SUPABASE_KEY=$(echo "$ENV_RESPONSE" | jq -r '.NEXT_PUBLIC_SUPABASE_ANON_KEY' 2>/dev/null || echo "")

if [ -n "$SUPABASE_URL" ] && [ "$SUPABASE_URL" != "null" ] && [ "$SUPABASE_URL" != "" ]; then
    echo -e "${GREEN}✓${NC} SUPABASE_URL is available"
else
    echo -e "${RED}✗${NC} SUPABASE_URL is MISSING"
    echo "Cannot proceed without Supabase URL. Please set environment variables in Railway."
    exit 1
fi

if [ -n "$SUPABASE_KEY" ] && [ "$SUPABASE_KEY" != "null" ] && [ "$SUPABASE_KEY" != "" ]; then
    echo -e "${GREEN}✓${NC} SUPABASE_ANON_KEY is available"
else
    echo -e "${RED}✗${NC} SUPABASE_ANON_KEY is MISSING"
    echo "Cannot proceed without Supabase anon key. Please set environment variables in Railway."
    exit 1
fi
echo ""

# Test 2: Check credits balance without auth (should return 401)
echo -e "${BLUE}Test 2: Credits Balance (No Auth)${NC}"
echo "Testing /api/credits/balance without authentication..."
CREDITS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$PROD_URL/api/credits/balance")
CREDITS_HTTP_CODE=$(echo "$CREDITS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
CREDITS_BODY=$(echo "$CREDITS_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $CREDITS_HTTP_CODE"
echo "Response: $CREDITS_BODY"

if [ "$CREDITS_HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓${NC} Correctly returns 401 (unauthorized)"
else
    echo -e "${YELLOW}⚠${NC} Unexpected HTTP code: $CREDITS_HTTP_CODE"
    if [ "$CREDITS_HTTP_CODE" -eq 500 ]; then
        echo -e "${RED}Server error detected. Check Railway logs for details.${NC}"
    fi
fi
echo ""

# Test 3: Test Supabase auth endpoint directly
echo -e "${BLUE}Test 3: Supabase Auth Health${NC}"
echo "Testing Supabase auth endpoint..."
SUPABASE_HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -H "apikey: $SUPABASE_KEY" \
  "$SUPABASE_URL/auth/v1/health")
SUPABASE_HTTP_CODE=$(echo "$SUPABASE_HEALTH" | grep "HTTP_CODE:" | cut -d: -f2)

if [ "$SUPABASE_HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} Supabase auth is healthy"
else
    echo -e "${RED}✗${NC} Supabase auth returned HTTP $SUPABASE_HTTP_CODE"
fi
echo ""

# Test 4: Check if sync-user endpoint exists
echo -e "${BLUE}Test 4: User Sync Endpoint${NC}"
echo "Testing /api/auth/sync-user (should return 401 without auth)..."
SYNC_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"id":"test","email":"test@example.com"}' \
  "$PROD_URL/api/auth/sync-user")
SYNC_HTTP_CODE=$(echo "$SYNC_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
SYNC_BODY=$(echo "$SYNC_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $SYNC_HTTP_CODE"
echo "Response: $SYNC_BODY"

if [ "$SYNC_HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓${NC} Sync endpoint exists and requires auth"
elif [ "$SYNC_HTTP_CODE" -eq 404 ]; then
    echo -e "${RED}✗${NC} Sync endpoint not found (deployment may not be updated)"
else
    echo -e "${YELLOW}⚠${NC} Unexpected response: $SYNC_HTTP_CODE"
fi
echo ""

# Test 5: Simulate auth flow (manual test instructions)
echo -e "${BLUE}Test 5: Manual Auth Flow Test${NC}"
echo "=========================================="
echo "To test the complete auth flow manually:"
echo ""
echo "1. Open browser and go to: ${PROD_URL}/auth/login"
echo "2. Open DevTools → Console"
echo "3. Click 'Continue with Google'"
echo "4. After OAuth redirect, check console for:"
echo "   - [AUTH CALLBACK] Exchange error (if any)"
echo "   - [AUTH CALLBACK] Sync user failed (if any)"
echo "   - [SYNC USER] logs in Network tab"
echo ""
echo "5. Check Network tab for:"
echo "   - POST /api/auth/sync-user (should return 200)"
echo "   - GET /api/credits/balance (should return 200 with credits)"
echo ""
echo "6. Check Application → Cookies for:"
echo "   - sb-vjkxwklusgjxcpddcwjl-auth-token (should exist)"
echo ""
echo "If you see 401 or 500 errors, check Railway logs:"
echo "   - Look for [SERVER SUPABASE ENV] logs"
echo "   - Look for [SYNC USER] logs"
echo "   - Look for database connection errors"
echo ""

# Test 6: Check Railway deployment status
echo -e "${BLUE}Test 6: Deployment Check${NC}"
echo "=========================================="
echo "Checking if latest code is deployed..."
echo ""
echo "Expected behavior after latest deployment:"
echo "  ✓ /auth/callback should exchange OAuth code"
echo "  ✓ /auth/callback should call /api/auth/sync-user"
echo "  ✓ User should be created in Prisma database"
echo "  ✓ /api/credits/balance should return 200"
echo ""
echo "If you're still seeing 401/500 errors:"
echo "  1. Check Railway → Deployments → Latest deployment status"
echo "  2. Ensure the deployment includes the latest commits"
echo "  3. Check Railway → Logs for error messages"
echo "  4. Verify DATABASE_URL is set correctly in Railway"
echo ""

# Summary
echo "=========================================="
echo -e "${BLUE}📊 Summary${NC}"
echo "=========================================="

ISSUES=0

if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "null" ] || [ "$SUPABASE_URL" = "" ]; then
    echo -e "${RED}✗${NC} SUPABASE_URL is missing"
    ISSUES=$((ISSUES + 1))
fi

if [ -z "$SUPABASE_KEY" ] || [ "$SUPABASE_KEY" = "null" ] || [ "$SUPABASE_KEY" = "" ]; then
    echo -e "${RED}✗${NC} SUPABASE_ANON_KEY is missing"
    ISSUES=$((ISSUES + 1))
fi

if [ "$SYNC_HTTP_CODE" -eq 404 ]; then
    echo -e "${RED}✗${NC} /api/auth/sync-user endpoint not found (deployment not updated)"
    ISSUES=$((ISSUES + 1))
fi

if [ "$CREDITS_HTTP_CODE" -eq 500 ]; then
    echo -e "${RED}✗${NC} /api/credits/balance returns 500 (database or server error)"
    ISSUES=$((ISSUES + 1))
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ Infrastructure looks good${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Test login manually in browser"
    echo "  2. Check browser console for [AUTH CALLBACK] logs"
    echo "  3. Check Railway logs for [SYNC USER] logs"
    echo "  4. Verify user is created in database"
else
    echo -e "${RED}✗ Found $ISSUES issue(s)${NC}"
    echo ""
    echo "🔧 Recommended fixes:"
    if [ "$SYNC_HTTP_CODE" -eq 404 ]; then
        echo "  - Wait for Railway to finish deploying latest code"
        echo "  - Check Railway → Deployments for status"
    fi
    if [ "$CREDITS_HTTP_CODE" -eq 500 ]; then
        echo "  - Check Railway logs for database errors"
        echo "  - Verify DATABASE_URL is set correctly"
        echo "  - Check Prisma schema matches database"
    fi
fi
echo ""
