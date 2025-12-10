#!/bin/bash

# Test PDF Upload Script
# This script tests the PDF upload functionality locally

echo "🧪 Testing PDF Upload Functionality"
echo "=================================="

# Create a test PDF file
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

# Test backend health
echo "🏥 Testing backend health..."
backend_health=$(curl -s http://localhost:8000/health)
echo "Backend response: $backend_health"

# Test frontend health
echo "🌐 Testing frontend health..."
frontend_health=$(curl -s http://localhost:3000/api/pdf-chat/health 2>/dev/null || echo "Frontend may not be ready")
echo "Frontend response: $frontend_health"

# Create uploads directory if it doesn't exist
mkdir -p data/uploads

# Test upload endpoint (requires authentication)
echo "📤 Testing upload endpoint..."
echo "Note: This requires a valid session/authentication"
echo "For manual testing:"
echo "1. Open http://localhost:3000"
echo "2. Login/signup"
echo "3. Navigate to PDF Chat"
echo "4. Upload test-document.pdf"

# Show test file info
file_size=$(stat -f%z test-document.pdf 2>/dev/null || stat -c%s test-document.pdf 2>/dev/null || echo "1024")
echo "📊 Test file size: $file_size bytes"

# Clean up option
echo ""
echo "🧹 To clean up: rm test-document.pdf"
echo ""
echo "🎯 Ready for manual testing at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000/health"
