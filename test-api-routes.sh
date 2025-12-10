#!/bin/bash

# Test API routes for Settings page
echo "Testing API routes..."
echo ""

# Get the base URL from environment or use localhost
BASE_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"

echo "Base URL: $BASE_URL"
echo ""

# Test Profile API
echo "1. Testing /api/user/profile"
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/user/profile"
echo ""

# Test Subscription Status API
echo "2. Testing /api/subscription/status"
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/subscription/status"
echo ""

# Test Payment History API
echo "3. Testing /api/payment/history"
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/payment/history"
echo ""

# Test Credits History API
echo "4. Testing /api/credits/history"
curl -s -o /dev/null -w "Status: %{http_code}\n" "$BASE_URL/api/credits/history"
echo ""

echo "Note: 401 (Unauthorized) is expected without authentication"
echo "404 means the route doesn't exist or isn't properly configured"
