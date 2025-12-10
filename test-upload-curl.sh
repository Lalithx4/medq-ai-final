#!/bin/bash

# Simple curl-based PDF upload test script

echo "🧪 PDF Upload Test Script"
echo "========================"

# Create a simple test PDF
echo "📄 Creating test PDF..."
cat > test-document.pdf << 'EOF'
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
(Test PDF Document for Upload Testing) Tj
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

echo "✅ Test PDF created: test-document.pdf"
echo "📊 File size: $(stat -f%z test-document.pdf 2>/dev/null || stat -c%s test-document.pdf 2>/dev/null || echo '1024') bytes"

# Test backend health
echo ""
echo "🏥 Testing backend health..."
curl -s http://localhost:8000/health | jq . 2>/dev/null || curl -s http://localhost:8000/health

# Test backend system info
echo ""
echo "🔧 Testing backend system info..."
curl -s http://localhost:8000/api/pdf-chat/system-info | jq . 2>/dev/null || curl -s http://localhost:8000/api/pdf-chat/system-info

echo ""
echo "🎯 Manual Testing Instructions:"
echo "=============================="
echo "1. Open browser: http://localhost:3000"
echo "2. Login/signup to create account"
echo "3. Navigate to PDF Chat section"
echo "4. Upload: test-document.pdf"
echo "5. Check browser console for any errors"
echo ""
echo "📋 Test file ready: test-document.pdf"
echo "🧹 Cleanup: rm test-document.pdf"
