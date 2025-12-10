#!/usr/bin/env node

/**
 * Test PDF Upload API Script
 * Tests the upload endpoint with a test PDF
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Check if form-data is available
let formDataAvailable = false;
try {
  require.resolve('form-data');
  formDataAvailable = true;
} catch (e) {
  console.log('ℹ️  form-data not available, installing...');
  require('child_process').execSync('npm install form-data', { stdio: 'inherit' });
  formDataAvailable = true;
}

const FormData = require('form-data');

// Test configuration
const FRONTEND_URL = 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8000';

console.log('🧪 Testing PDF Upload API');
console.log('=======================');

// Create test PDF
const testPdfPath = path.join(__dirname, 'test-document.pdf');
const testPdfContent = Buffer.from(`
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
`, 'binary');

fs.writeFileSync(testPdfPath, testPdfContent);
console.log('✅ Created test PDF:', testPdfPath);

// Test backend health
async function testBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    const data = await response.json();
    console.log('🏥 Backend health:', data);
    return response.ok;
  } catch (error) {
    console.error('❌ Backend health check failed:', error.message);
    return false;
  }
}

// Test direct backend process endpoint
async function testBackendProcess() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/pdf-chat/system-info`);
    const data = await response.json();
    console.log('🔧 Backend system info:', data);
    return response.ok;
  } catch (error) {
    console.error('❌ Backend system info failed:', error.message);
    return false;
  }
}

// Test frontend upload endpoint (requires auth)
async function testFrontendUpload() {
  console.log('\n📤 Testing frontend upload endpoint...');
  console.log('Note: This requires authentication via browser');
  console.log('Manual test steps:');
  console.log('1. Open http://localhost:3000');
  console.log('2. Login/signup');
  console.log('3. Navigate to PDF Chat');
  console.log('4. Upload test-document.pdf');
  
  return {
    testFile: testPdfPath,
    frontendUrl: `${FRONTEND_URL}/pdf-chat`,
    backendUrl: `${BACKEND_URL}/health`
  };
}

// Run all tests
async function runTests() {
  console.log('🚀 Running tests...\n');
  
  const backendHealth = await testBackendHealth();
  const backendSystem = await testBackendProcess();
  const frontendTest = await testFrontendUpload();
  
  console.log('\n📋 Test Results:');
  console.log('================');
  console.log('Backend Health:', backendHealth ? '✅ PASS' : '❌ FAIL');
  console.log('Backend System:', backendSystem ? '✅ PASS' : '❌ FAIL');
  console.log('Frontend Test: Manual testing required');
  
  console.log('\n🎯 Ready for testing:');
  console.log('Test file:', frontendTest.testFile);
  console.log('Frontend:', frontendTest.frontendUrl);
  console.log('Backend:', frontendTest.backendUrl);
}

// Check if running as script
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
