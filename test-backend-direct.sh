#!/bin/bash

# Test backend directly without frontend authentication

echo "🔍 Testing backend directly..."
echo "=============================="

# Test backend health
echo "🏥 Backend health:"
curl -s http://localhost:8000/health | jq .

# Test backend system info
echo ""
echo "🔧 Backend system info:"
curl -s http://localhost:8000/api/pdf-chat/system-info | jq .

# Create test file for direct backend testing
echo ""
echo "📋 Creating test PDF for backend..."
cat > backend-test.pdf << 'EOF'
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
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF for Backend Processing) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
298
%%EOF
EOF

echo "✅ Created backend-test.pdf"

# Test file size
echo "📊 File size: $(stat -f%z backend-test.pdf 2>/dev/null || stat -c%s backend-test.pdf) bytes"

echo ""
echo "🎯 Ready for testing:"
echo "1. Backend is running on http://localhost:8000"
echo "2. Test file: backend-test.pdf"
echo "3. Use browser to upload via frontend at http://localhost:3000"
