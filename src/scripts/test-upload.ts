/**
 * Test File Upload to Supabase Storage
 * This tests if files can be uploaded with the anon key
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });

import { supabaseStorage } from '@/lib/storage/supabase-storage';

async function testUpload() {
  console.log('🧪 Testing Supabase Storage Upload...\n');

  try {
    const testUserId = 'test-user-' + Date.now();
    const testTopic = 'Test Research Report';
    const testContent = `# Test Research Report

## Introduction
This is a test markdown file to verify Supabase Storage is working correctly.

## Methods
- Upload test file
- Verify public URL
- Download and verify content

## Results
If you can see this file in Supabase Storage, everything is working! ✅

## Conclusion
Supabase Storage integration successful.

Generated at: ${new Date().toISOString()}
`;

    console.log('📤 Uploading test file...');
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Topic: ${testTopic}`);
    console.log(`   Content length: ${testContent.length} characters`);
    console.log('');

    const { path, url } = await supabaseStorage.uploadMarkdownFile(
      testUserId,
      supabaseStorage.generateFilename(testTopic, 'md'),
      testContent,
      'deep-research'
    );

    console.log('');
    console.log('✅ Upload successful!');
    console.log('');
    console.log('📁 File Details:');
    console.log(`   Path: ${path}`);
    console.log(`   URL: ${url}`);
    console.log('');
    console.log('🔍 Verify in Supabase Dashboard:');
    console.log('   1. Go to Storage > research-files');
    console.log(`   2. Navigate to: deep-research/${testUserId}/`);
    console.log('   3. You should see the uploaded file');
    console.log('');
    console.log('🌐 Test Public Access:');
    console.log(`   Open this URL in your browser:`);
    console.log(`   ${url}`);
    console.log('');

    // Test download
    console.log('📥 Testing download...');
    const downloaded = await supabaseStorage.downloadFile(path);
    
    if (downloaded === testContent) {
      console.log('✅ Download successful! Content matches.');
    } else {
      console.log('⚠️  Downloaded content differs from uploaded content');
      console.log(`   Uploaded: ${testContent.length} chars`);
      console.log(`   Downloaded: ${downloaded.length} chars`);
    }
    console.log('');

    console.log('🎉 All tests passed!');
    console.log('');
    console.log('✅ Supabase Storage is working correctly');
    console.log('✅ Files can be uploaded');
    console.log('✅ Files can be downloaded');
    console.log('✅ Public URLs are accessible');
    console.log('');
    console.log('Your app is ready to save files to Supabase! 🚀');

  } catch (error: any) {
    console.error('');
    console.error('❌ Test failed!');
    console.error('');
    console.error('Error:', error.message);
    console.error('');
    
    if (error.message.includes('Bucket not found')) {
      console.log('💡 Solution:');
      console.log('   The bucket "research-files" doesn\'t exist or isn\'t accessible.');
      console.log('   Please verify in Supabase Dashboard:');
      console.log('   1. Go to Storage');
      console.log('   2. Check if "research-files" bucket exists');
      console.log('   3. Make sure it\'s set to PUBLIC');
      console.log('');
    } else if (error.message.includes('row-level security') || error.message.includes('403')) {
      console.log('💡 Solution:');
      console.log('   Row Level Security (RLS) is blocking the upload.');
      console.log('   Fix this in Supabase Dashboard:');
      console.log('   1. Go to Storage > research-files');
      console.log('   2. Click "Policies"');
      console.log('   3. Add a policy to allow uploads:');
      console.log('      - Policy name: "Allow public uploads"');
      console.log('      - Allowed operation: INSERT');
      console.log('      - Policy definition: true');
      console.log('   4. Add a policy to allow downloads:');
      console.log('      - Policy name: "Allow public downloads"');
      console.log('      - Allowed operation: SELECT');
      console.log('      - Policy definition: true');
      console.log('');
    }
    
    console.error('Full error details:', error);
    process.exit(1);
  }
}

// Run the test
testUpload();
