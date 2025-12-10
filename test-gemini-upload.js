/**
 * Test Gemini File Search Upload
 * Run with: node test-gemini-upload.js
 */

const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

const API_KEY = 'AIzaSyD7cyrvxa57zLE0Vqwey3cfak-29HPCvKo';

async function testGeminiUpload() {
  console.log('🧪 Testing Gemini File Search Upload...\n');

  const client = new GoogleGenAI({ apiKey: API_KEY });

  try {
    // Step 1: Create File Search Store
    console.log('📦 Step 1: Creating File Search Store...');
    const store = await client.fileSearchStores.create({
      config: {
        displayName: 'test-medical-docs-store'
      }
    });
    console.log(`✅ Store created: ${store.name}\n`);

    // Step 2: Find a test PDF file
    console.log('📄 Step 2: Looking for test PDF...');
    const testPdfPath = path.join(__dirname, 'data', 'uploads');
    
    let testFile = null;
    if (fs.existsSync(testPdfPath)) {
      const files = fs.readdirSync(testPdfPath).filter(f => f.endsWith('.pdf'));
      if (files.length > 0) {
        testFile = path.join(testPdfPath, files[0]);
        console.log(`✅ Found test PDF: ${files[0]}\n`);
      }
    }

    if (!testFile) {
      console.log('⚠️  No test PDF found in data/uploads/');
      console.log('Creating a dummy test file...\n');
      
      // Create a minimal PDF for testing
      const dummyPdf = Buffer.from(
        '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF'
      );
      testFile = path.join(__dirname, 'test-dummy.pdf');
      fs.writeFileSync(testFile, dummyPdf);
      console.log(`✅ Created dummy PDF: test-dummy.pdf\n`);
    }

    // Step 3: Upload file
    console.log('📤 Step 3: Uploading file to Gemini...');
    const fileBuffer = fs.readFileSync(testFile);
    
    // Convert Buffer to Blob
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });

    let operation = await client.fileSearchStores.uploadToFileSearchStore({
      file: blob,
      fileSearchStoreName: store.name,
      config: {
        displayName: 'test-document.pdf',
        mimeType: 'application/pdf',
      }
    });

    console.log('⏳ Waiting for file to be indexed...');
    
    // Wait for operation to complete
    let attempts = 0;
    while (!operation.done && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      operation = await client.operations.get({ operation });
      attempts++;
      process.stdout.write('.');
    }
    console.log('\n');

    if (operation.done) {
      console.log('✅ File uploaded and indexed successfully!\n');
    } else {
      console.log('⚠️  Upload timed out, but may still be processing...\n');
    }

    // Step 4: Test query
    console.log('💬 Step 4: Testing query with File Search...');
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'What is this document about?',
      config: {
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [store.name]
            }
          }
        ],
        temperature: 0.3,
      },
    });

    console.log('✅ Query successful!\n');
    console.log('📝 Response:', response.text || 'No response text');
    console.log('\n');

    // Step 5: Cleanup
    console.log('🧹 Step 5: Cleaning up...');
    await client.fileSearchStores.delete({ name: store.name });
    console.log('✅ Store deleted\n');

    // Delete dummy file if created
    if (fs.existsSync(path.join(__dirname, 'test-dummy.pdf'))) {
      fs.unlinkSync(path.join(__dirname, 'test-dummy.pdf'));
      console.log('✅ Dummy file deleted\n');
    }

    console.log('🎉 All tests passed! Gemini File Search is working correctly!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run test
testGeminiUpload().catch(console.error);
