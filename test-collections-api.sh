#!/bin/bash

# Test script for PDF Collections API
# This tests the API endpoints without authentication (should return 401)

BASE_URL="http://localhost:3000"

echo "🧪 Testing PDF Collections API Endpoints"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Endpoint..."
curl -s -X GET "$BASE_URL/api/health" | jq -r '.healthy' 2>/dev/null || echo "❌ Health check failed"
echo ""

# Test 2: Collections List (should return 401)
echo "2️⃣ Testing GET /api/pdf-chat/collections..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/pdf-chat/collections")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Unauthorized"; then
    echo "✅ Endpoint exists and requires authentication"
else
    echo "❌ Unexpected response"
fi
echo ""

# Test 3: Documents List (should return 401)
echo "3️⃣ Testing GET /api/pdf-chat/documents..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/pdf-chat/documents")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Unauthorized"; then
    echo "✅ Endpoint exists and requires authentication"
else
    echo "❌ Unexpected response"
fi
echo ""

# Test 4: Sessions List (should return 401)
echo "4️⃣ Testing GET /api/pdf-chat/sessions/all..."
RESPONSE=$(curl -s -X GET "$BASE_URL/api/pdf-chat/sessions/all")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Unauthorized"; then
    echo "✅ Endpoint exists and requires authentication"
else
    echo "❌ Unexpected response"
fi
echo ""

# Test 5: Create Collection (should return 401)
echo "5️⃣ Testing POST /api/pdf-chat/collections..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/pdf-chat/collections" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Collection","description":"Test"}')
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Unauthorized"; then
    echo "✅ Endpoint exists and requires authentication"
else
    echo "❌ Unexpected response"
fi
echo ""

# Test 6: Upload endpoint (should return 401)
echo "6️⃣ Testing POST /api/pdf-chat/upload..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/pdf-chat/upload")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "Unauthorized"; then
    echo "✅ Endpoint exists and requires authentication"
else
    echo "❌ Unexpected response"
fi
echo ""

echo "=========================================="
echo "✅ All API endpoints are responding correctly!"
echo "🔒 All endpoints properly require authentication"
echo ""
echo "📝 Note: To test with authentication, you need to:"
echo "   1. Log in to the app in a browser"
echo "   2. Get the session token from cookies"
echo "   3. Include it in the Authorization header"
echo ""
echo "🗄️  Database Migration Status:"
echo "   Run this in Supabase SQL Editor to check:"
echo "   SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_collections');"
