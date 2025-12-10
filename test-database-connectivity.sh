#!/bin/bash

# Database Connectivity Test Script
# Diagnoses 500 errors by checking database and env configuration

set -e

PROD_URL="https://www.biodocs.ai"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Testing Database Connectivity on Railway"
echo "=========================================="
echo ""

# Test 1: Check health endpoint (if deployed)
echo -e "${BLUE}Test 1: Health Check Endpoint${NC}"
echo "Testing /api/health..."
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$PROD_URL/api/health" 2>/dev/null || echo "")
HEALTH_HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2 2>/dev/null || echo "000")
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_CODE:/d' 2>/dev/null || echo "{}")

if [ "$HEALTH_HTTP_CODE" -eq 200 ] || [ "$HEALTH_HTTP_CODE" -eq 503 ]; then
    echo "HTTP Code: $HEALTH_HTTP_CODE"
    echo "$HEALTH_BODY" | jq '.' 2>/dev/null || echo "$HEALTH_BODY"
    
    # Parse health check results
    DB_STATUS=$(echo "$HEALTH_BODY" | jq -r '.checks.database.status' 2>/dev/null || echo "unknown")
    DB_ERROR=$(echo "$HEALTH_BODY" | jq -r '.checks.database.error' 2>/dev/null || echo "null")
    DATABASE_URL_SET=$(echo "$HEALTH_BODY" | jq -r '.checks.env.DATABASE_URL' 2>/dev/null || echo "unknown")
    
    if [ "$DB_STATUS" = "connected" ]; then
        echo -e "${GREEN}✓${NC} Database is connected"
    elif [ "$DB_STATUS" = "error" ]; then
        echo -e "${RED}✗${NC} Database connection failed"
        if [ "$DB_ERROR" != "null" ]; then
            echo "Error: $DB_ERROR"
        fi
    else
        echo -e "${YELLOW}⚠${NC} Database status unknown"
    fi
    
    if [ "$DATABASE_URL_SET" = "MISSING" ]; then
        echo -e "${RED}✗${NC} DATABASE_URL environment variable is MISSING"
    elif [ "$DATABASE_URL_SET" = "SET" ]; then
        echo -e "${GREEN}✓${NC} DATABASE_URL is set"
    fi
elif [ "$HEALTH_HTTP_CODE" -eq 404 ]; then
    echo -e "${YELLOW}⚠${NC} Health endpoint not found (not deployed yet)"
else
    echo -e "${YELLOW}⚠${NC} Could not reach health endpoint (HTTP $HEALTH_HTTP_CODE)"
fi
echo ""

# Test 2: Test credits balance endpoint (requires auth, but we can see the error type)
echo -e "${BLUE}Test 2: Credits Balance Endpoint${NC}"
echo "Testing /api/credits/balance..."
CREDITS_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$PROD_URL/api/credits/balance")
CREDITS_HTTP_CODE=$(echo "$CREDITS_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
CREDITS_BODY=$(echo "$CREDITS_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $CREDITS_HTTP_CODE"
echo "Response: $CREDITS_BODY"

if [ "$CREDITS_HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓${NC} Returns 401 (auth required, but endpoint works)"
elif [ "$CREDITS_HTTP_CODE" -eq 500 ]; then
    echo -e "${RED}✗${NC} Returns 500 (server error - likely database issue)"
    echo "This suggests DATABASE_URL is missing or database is unreachable"
else
    echo -e "${YELLOW}⚠${NC} Unexpected HTTP code: $CREDITS_HTTP_CODE"
fi
echo ""

# Test 3: Test files list endpoint
echo -e "${BLUE}Test 3: Files List Endpoint${NC}"
echo "Testing /api/files/list..."
FILES_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$PROD_URL/api/files/list")
FILES_HTTP_CODE=$(echo "$FILES_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
FILES_BODY=$(echo "$FILES_RESPONSE" | sed '/HTTP_CODE:/d')

echo "HTTP Code: $FILES_HTTP_CODE"
echo "Response: $FILES_BODY"

if [ "$FILES_HTTP_CODE" -eq 401 ]; then
    echo -e "${GREEN}✓${NC} Returns 401 (auth required, but endpoint works)"
elif [ "$FILES_HTTP_CODE" -eq 500 ]; then
    echo -e "${RED}✗${NC} Returns 500 (server error - likely database issue)"
else
    echo -e "${YELLOW}⚠${NC} Unexpected HTTP code: $FILES_HTTP_CODE"
fi
echo ""

# Test 4: Check if Supabase env vars are set
echo -e "${BLUE}Test 4: Supabase Environment Variables${NC}"
ENV_RESPONSE=$(curl -s "$PROD_URL/api/public-env")
SUPABASE_URL=$(echo "$ENV_RESPONSE" | jq -r '.NEXT_PUBLIC_SUPABASE_URL' 2>/dev/null || echo "")
SUPABASE_KEY=$(echo "$ENV_RESPONSE" | jq -r '.NEXT_PUBLIC_SUPABASE_ANON_KEY' 2>/dev/null || echo "")

if [ -n "$SUPABASE_URL" ] && [ "$SUPABASE_URL" != "null" ] && [ "$SUPABASE_URL" != "" ]; then
    echo -e "${GREEN}✓${NC} SUPABASE_URL: $SUPABASE_URL"
else
    echo -e "${RED}✗${NC} SUPABASE_URL is missing"
fi

if [ -n "$SUPABASE_KEY" ] && [ "$SUPABASE_KEY" != "null" ] && [ "$SUPABASE_KEY" != "" ]; then
    KEY_LEN=${#SUPABASE_KEY}
    echo -e "${GREEN}✓${NC} SUPABASE_ANON_KEY: ${SUPABASE_KEY:0:6}...len=$KEY_LEN"
else
    echo -e "${RED}✗${NC} SUPABASE_ANON_KEY is missing"
fi
echo ""

# Summary and diagnosis
echo "=========================================="
echo -e "${BLUE}📊 Diagnosis${NC}"
echo "=========================================="
echo ""

CRITICAL_ISSUES=0

# Check for database issues
if [ "$CREDITS_HTTP_CODE" -eq 500 ] || [ "$FILES_HTTP_CODE" -eq 500 ]; then
    echo -e "${RED}🔴 CRITICAL: Multiple endpoints returning 500 errors${NC}"
    echo ""
    echo "Root cause: Database connection failure"
    echo ""
    echo "Possible reasons:"
    echo "  1. DATABASE_URL not set in Railway environment variables"
    echo "  2. Database is unreachable from Railway"
    echo "  3. Database credentials are incorrect"
    echo "  4. Prisma client not generated properly"
    echo ""
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if [ "$DATABASE_URL_SET" = "MISSING" ]; then
    echo -e "${RED}🔴 CRITICAL: DATABASE_URL environment variable is MISSING${NC}"
    echo ""
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if [ "$DB_STATUS" = "error" ]; then
    echo -e "${RED}🔴 CRITICAL: Database connection test failed${NC}"
    if [ "$DB_ERROR" != "null" ]; then
        echo "Error message: $DB_ERROR"
    fi
    echo ""
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

# Provide solutions
if [ $CRITICAL_ISSUES -gt 0 ]; then
    echo "=========================================="
    echo -e "${YELLOW}🔧 Required Fixes${NC}"
    echo "=========================================="
    echo ""
    echo "1. Set DATABASE_URL in Railway:"
    echo "   - Go to Railway → Your Service → Variables"
    echo "   - Add: DATABASE_URL=<your-database-connection-string>"
    echo ""
    echo "   Common formats:"
    echo "   - PostgreSQL: postgresql://user:password@host:5432/database"
    echo "   - Supabase: postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
    echo ""
    echo "2. If using Supabase database:"
    echo "   - Go to Supabase Dashboard → Project Settings → Database"
    echo "   - Copy 'Connection string' (URI format)"
    echo "   - Use 'Connection pooling' string for production"
    echo ""
    echo "3. After setting DATABASE_URL:"
    echo "   - Redeploy in Railway"
    echo "   - Run this script again to verify"
    echo ""
else
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Database connectivity is working."
    echo "If you're still seeing 500 errors in the browser:"
    echo "  1. Clear browser cache and cookies"
    echo "  2. Check Railway logs for specific error messages"
    echo "  3. Verify user authentication is working"
fi

echo ""
echo "=========================================="
echo "For more details, check Railway logs:"
echo "  Railway Dashboard → Your Service → Logs"
echo "=========================================="
echo ""
