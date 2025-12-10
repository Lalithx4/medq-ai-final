#!/bin/bash

# PDF Upload Test Script with curl
# Tests the complete upload flow

echo "🧪 PDF Upload Test with curl"
echo "============================"

# Configuration
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:8000"
API_KEY="ea75a5e56c5c11b2fb1abfa9bf5bcdb66a0e5df41aadabca466f29ef35a0e303"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create test PDF
echo "📄 Creating test PDF..."
cat > test-upload.pdf << 'EOF'
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 100
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF for Upload Testing) Tj
100 680 Td
(Medical Document Sample) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000265 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
365
%%EOF
EOF

echo -e "${GREEN}✅ Test PDF created: test-upload.pdf${NC}"
echo "📊 File size: $(stat -f%z test-upload.pdf 2>/dev/null || stat -c%s test-upload.pdf) bytes"

# Test 1: Backend Health
echo ""
echo "🏥 Testing Backend Health..."
backend_response=$(curl -s -w "\n%{http_code}" $BACKEND_URL/health)
backend_code=$(echo "$backend_response" | tail -n1)
backend_body=$(echo "$backend_response" | head -n-1)

if [ "$backend_code" = "200" ]; then
    echo -e "${GREEN}✅ Backend Health: OK${NC}"
    echo "$backend_body" | jq . 2>/dev/null || echo "$backend_body"
else
    echo -e "${RED}❌ Backend Health: FAILED (HTTP $backend_code)${NC}"
    echo "$backend_body"
fi

# Test 2: Backend System Info with API Key
echo ""
echo "🔧 Testing Backend System Info..."
system_response=$(curl -s -w "\n%{http_code}" -H "X-API-Key: $API_KEY" $BACKEND_URL/api/pdf-chat/system-info)
system_code=$(echo "$system_response" | tail -n1)
system_body=$(echo "$system_response" | head -n-1)

if [ "$system_code" = "200" ]; then
    echo -e "${GREEN}✅ System Info: OK${NC}"
    echo "$system_body" | jq . 2>/dev/null || echo "$system_body"
else
    echo -e "${RED}❌ System Info: FAILED (HTTP $system_code)${NC}"
    echo "$system_body"
fi

# Test 3: Frontend Health
echo ""
echo "🌐 Testing Frontend..."
frontend_response=$(curl -s -w "\n%{http_code}" $FRONTEND_URL)
frontend_code=$(echo "$frontend_response" | tail -n1)

if [ "$frontend_code" = "200" ]; then
    echo -e "${GREEN}✅ Frontend: OK${NC}"
else
    echo -e "${RED}❌ Frontend: FAILED (HTTP $frontend_code)${NC}"
fi

# Test 4: Check if user is logged in (requires session cookie)
echo ""
echo "🔐 Testing Upload Endpoint (requires authentication)..."
echo -e "${YELLOW}Note: This test requires a valid session cookie${NC}"
echo ""
echo "To test upload manually:"
echo "1. Open browser and login at: $FRONTEND_URL"
echo "2. Open browser console (F12)"
echo "3. Get cookies from Application tab"
echo "4. Use this curl command with your session cookie:"
echo ""
echo "curl -X POST $FRONTEND_URL/api/pdf-chat/upload \\"
echo "  -H 'Cookie: YOUR_SESSION_COOKIE' \\"
echo "  -F 'file=@test-upload.pdf'"

# Test 5: Check Supabase table structure
echo ""
echo "📋 Database Schema Check:"
echo "========================"
echo "Expected PdfDocument columns:"
echo "  - id (uuid)"
echo "  - userId (text)"
echo "  - filename (text)"
echo "  - originalName (text)"
echo "  - fileUrl (text)"
echo "  - fileSize (integer)"
echo "  - pageCount (integer, nullable)"
echo "  - status (text)"
echo "  - processingError (text, nullable)"
echo "  - createdAt (timestamp)"
echo "  - updatedAt (timestamp)"

echo ""
echo "🎯 Test Summary"
echo "=============="
echo "Backend Health: $([ "$backend_code" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo "System Info: $([ "$system_code" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"
echo "Frontend: $([ "$frontend_code" = "200" ] && echo -e "${GREEN}✅ PASS${NC}" || echo -e "${RED}❌ FAIL${NC}")"

echo ""
echo "📝 Next Steps:"
echo "============="
echo "1. Login to $FRONTEND_URL"
echo "2. Navigate to PDF Chat"
echo "3. Upload test-upload.pdf"
echo "4. Check browser console for errors"
echo "5. Check terminal logs for database errors"

echo ""
echo "🧹 Cleanup: rm test-upload.pdf"
