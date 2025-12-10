#!/bin/bash

# Railway Deployment Test Script
# Tests env availability and auth flow on production

set -e

PROD_URL="https://www.biodocs.ai"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 Testing Railway Deployment: $PROD_URL"
echo "=========================================="
echo ""

# Test 1: Check if site is up
echo "📡 Test 1: Site availability"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL")
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 301 ] || [ "$HTTP_CODE" -eq 302 ]; then
    echo -e "${GREEN}✓${NC} Site is up (HTTP $HTTP_CODE)"
else
    echo -e "${RED}✗${NC} Site returned HTTP $HTTP_CODE"
fi
echo ""

# Test 2: Check public env endpoint
echo "🔑 Test 2: Public env endpoint (/api/public-env)"
ENV_RESPONSE=$(curl -s "$PROD_URL/api/public-env")
echo "Response:"
echo "$ENV_RESPONSE" | jq '.' 2>/dev/null || echo "$ENV_RESPONSE"

# Parse and check if env vars are present
SUPABASE_URL=$(echo "$ENV_RESPONSE" | jq -r '.NEXT_PUBLIC_SUPABASE_URL' 2>/dev/null || echo "")
SUPABASE_KEY=$(echo "$ENV_RESPONSE" | jq -r '.NEXT_PUBLIC_SUPABASE_ANON_KEY' 2>/dev/null || echo "")

if [ -n "$SUPABASE_URL" ] && [ "$SUPABASE_URL" != "null" ] && [ "$SUPABASE_URL" != "" ]; then
    echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL is set: $SUPABASE_URL"
else
    echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_URL is MISSING or empty"
fi

if [ -n "$SUPABASE_KEY" ] && [ "$SUPABASE_KEY" != "null" ] && [ "$SUPABASE_KEY" != "" ]; then
    KEY_LEN=${#SUPABASE_KEY}
    MASKED_KEY="${SUPABASE_KEY:0:6}...len=$KEY_LEN"
    echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY is set: $MASKED_KEY"
else
    echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY is MISSING or empty"
fi
echo ""

# Test 3: Check credits balance endpoint (should return 401 without auth)
echo "💳 Test 3: Credits balance endpoint (/api/credits/balance)"
CREDITS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$PROD_URL/api/credits/balance")
CREDITS_HTTP_CODE=$(echo "$CREDITS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
CREDITS_BODY=$(echo "$CREDITS_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $CREDITS_HTTP_CODE"
echo "Response: $CREDITS_BODY"

if [ "$CREDITS_HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓${NC} Correctly returns 401 (unauthorized, expected without session)"
else
    echo -e "${YELLOW}⚠${NC} Unexpected HTTP code: $CREDITS_HTTP_CODE"
fi
echo ""

# Test 4: Check login page loads
echo "🔐 Test 4: Login page (/auth/login)"
LOGIN_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PROD_URL/auth/login")
if [ "$LOGIN_HTTP_CODE" -eq 200 ]; then
    echo -e "${GREEN}✓${NC} Login page loads (HTTP $LOGIN_HTTP_CODE)"
else
    echo -e "${RED}✗${NC} Login page returned HTTP $LOGIN_HTTP_CODE"
fi
echo ""

# Test 5: Fetch homepage and check for window.__ENV in HTML
echo "🌐 Test 5: Check if window.__ENV is injected in HTML"
HTML_RESPONSE=$(curl -s "$PROD_URL")
if echo "$HTML_RESPONSE" | grep -q "window.__ENV="; then
    echo -e "${GREEN}✓${NC} window.__ENV is injected in HTML"
    
    # Extract and parse the env object
    ENV_JSON=$(echo "$HTML_RESPONSE" | grep -o 'window.__ENV={[^}]*}' | sed 's/window.__ENV=//')
    echo "Injected env: $ENV_JSON"
    
    # Check if values are empty
    if echo "$ENV_JSON" | grep -q '"NEXT_PUBLIC_SUPABASE_URL":""'; then
        echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_URL is EMPTY in injected env"
    else
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_URL has a value in injected env"
    fi
    
    if echo "$ENV_JSON" | grep -q '"NEXT_PUBLIC_SUPABASE_ANON_KEY":""'; then
        echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY is EMPTY in injected env"
    else
        echo -e "${GREEN}✓${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY has a value in injected env"
    fi
else
    echo -e "${RED}✗${NC} window.__ENV is NOT found in HTML"
fi
echo ""

# Test 6: Check if Supabase is reachable
echo "🔗 Test 6: Supabase connectivity"
if [ -n "$SUPABASE_URL" ] && [ "$SUPABASE_URL" != "null" ] && [ "$SUPABASE_URL" != "" ]; then
    SUPABASE_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL")
    if [ "$SUPABASE_HTTP_CODE" -eq 200 ]; then
        echo -e "${GREEN}✓${NC} Supabase URL is reachable (HTTP $SUPABASE_HTTP_CODE)"
    else
        echo -e "${YELLOW}⚠${NC} Supabase URL returned HTTP $SUPABASE_HTTP_CODE"
    fi
else
    echo -e "${YELLOW}⚠${NC} Skipping (no Supabase URL available)"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Summary"
echo "=========================================="

ISSUES=0

if [ "$HTTP_CODE" -ne 200 ] && [ "$HTTP_CODE" -ne 301 ] && [ "$HTTP_CODE" -ne 302 ]; then
    echo -e "${RED}✗${NC} Site is not accessible"
    ISSUES=$((ISSUES + 1))
fi

if [ -z "$SUPABASE_URL" ] || [ "$SUPABASE_URL" = "null" ] || [ "$SUPABASE_URL" = "" ]; then
    echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_URL is missing from /api/public-env"
    ISSUES=$((ISSUES + 1))
fi

if [ -z "$SUPABASE_KEY" ] || [ "$SUPABASE_KEY" = "null" ] || [ "$SUPABASE_KEY" = "" ]; then
    echo -e "${RED}✗${NC} NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from /api/public-env"
    ISSUES=$((ISSUES + 1))
fi

if echo "$HTML_RESPONSE" | grep -q '"NEXT_PUBLIC_SUPABASE_URL":""'; then
    echo -e "${RED}✗${NC} window.__ENV has empty SUPABASE_URL in HTML"
    ISSUES=$((ISSUES + 1))
fi

if echo "$HTML_RESPONSE" | grep -q '"NEXT_PUBLIC_SUPABASE_ANON_KEY":""'; then
    echo -e "${RED}✗${NC} window.__ENV has empty SUPABASE_ANON_KEY in HTML"
    ISSUES=$((ISSUES + 1))
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "🎉 The deployment looks good. If login still fails:"
    echo "   1. Check browser console for client-side errors"
    echo "   2. Verify Supabase Auth settings (Site URL, Redirect URLs)"
    echo "   3. Check Railway logs for server-side errors"
else
    echo -e "${RED}✗ Found $ISSUES issue(s)${NC}"
    echo ""
    echo "🔧 Recommended fixes:"
    echo "   1. Go to Railway → Your Service → Variables"
    echo "   2. Set these environment variables:"
    echo "      - SUPABASE_URL=https://vjkxwklusgjxcpddcwjl.supabase.co"
    echo "      - SUPABASE_ANON_KEY=<your-anon-key>"
    echo "      - NEXT_PUBLIC_SUPABASE_URL=https://vjkxwklusgjxcpddcwjl.supabase.co"
    echo "      - NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>"
    echo "      - NEXT_PUBLIC_APP_URL=https://www.biodocs.ai"
    echo "   3. Redeploy the service"
    echo "   4. Run this script again to verify"
fi
echo ""
