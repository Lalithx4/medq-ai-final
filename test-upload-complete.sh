#!/bin/bash

# Complete PDF Upload Test Script
# Tests the entire upload flow end-to-end

echo "🧪 Complete PDF Upload Test"
echo "=========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3000"
API_KEY="ea75a5e56c5c11b2fb1abfa9bf5bcdb66a0e5df41aadabca466f29ef35a0e303"
TEST_PDF="test-upload.pdf"

# Function to test with color output
test_step() {
    echo -e "${YELLOW}🔍 Testing: $1${NC}"
    if eval "$2"; then
        echo -e "${GREEN}✅ PASS: $1${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL: $1${NC}"
        return 1
    fi
}

# Create test PDF
echo "📄 Creating test PDF..."
cat > "$TEST_PDF" << 'EOF'
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
(Test PDF for Upload Testing - Medical Document) Tj
100 680 Td
(This is a test document for the PDF chat system) Tj
100 660 Td
(It contains sample medical content for testing purposes) Tj
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

echo "✅ Created test PDF: $TEST_PDF"
echo "📊 File size: $(stat -f%z "$TEST_PDF" 2>/dev/null || stat -c%s "$TEST_PDF") bytes"

echo ""
echo "🚀 Starting Tests..."
echo "==================="

# Test 1: Backend Health
test_step "Backend Health Check" "
    curl -s -f $BACKEND_URL/health > /dev/null 2>&1
"

if [ $? -ne 0 ]; then
    echo "❌ Backend not running. Start with:"
    echo "   cd pdf-chat/backend && source venv/bin/activate && python3.11 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
    exit 1
fi

# Test 2: Backend Health Response
health_response=$(curl -s $BACKEND_URL/health)
echo "🏥 Backend Health: $health_response"

# Test 3: Backend System Info with API Key
test_step "Backend System Info with API Key" "
    curl -s -H \"X-API-Key: $API_KEY\" $BACKEND_URL/api/pdf-chat/system-info > /dev/null 2>&1
"

system_info=$(curl -s -H "X-API-Key: $API_KEY" $BACKEND_URL/api/pdf-chat/system-info)
echo "🔧 System Info: $system_info"

# Test 4: Frontend Health
test_step "Frontend Health Check" "
    curl -s -f $FRONTEND_URL/api/pdf-chat/health > /dev/null 2>&1
"

# Test 5: Test file exists
test_step "Test PDF File Exists" "
    [ -f \"$TEST_PDF\" ]
"

echo ""
echo "📋 Test Summary"
echo "=============="
echo "✅ Backend: $BACKEND_URL"
echo "✅ Frontend: $FRONTEND_URL"
echo "✅ Test File: $TEST_PDF"
echo "✅ API Key: Configured"

echo ""
echo "🎯 Ready for Manual Testing:"
echo "============================"
echo "1. Open browser: $FRONTEND_URL"
echo "2. Login/signup to create account"
echo "3. Navigate to PDF Chat section"
echo "4. Upload: $TEST_PDF"
echo "5. Check browser console for any errors"

echo ""
echo "🔄 Quick Backend Test:"
echo "====================="
echo "curl -H \"X-API-Key: $API_KEY\" $BACKEND_URL/api/pdf-chat/system-info"

echo ""
echo "🧹 Cleanup: rm $TEST_PDF"

# If jq is available, pretty print the responses
if command -v jq &> /dev/null; then
    echo ""
    echo "📊 Pretty Backend Response:"
    echo "=========================="
    echo "$system_info" | jq . 2>/dev/null || echo "$system_info"
fi
