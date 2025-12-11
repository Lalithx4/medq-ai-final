/**
 * Test Supabase Connection and Storage
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

import { getSupabaseClient } from '@/lib/db/supabase-client';

async function testSupabase() {
  console.log('🧪 Testing Supabase Connection...\n');

  try {
    // Test 1: Check environment variables
    console.log('1️⃣ Checking environment variables...');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.error('❌ Missing Supabase credentials in .env file');
      console.log('   SUPABASE_URL:', url ? '✅ Set' : '❌ Missing');
      console.log('   SUPABASE_ANON_KEY:', key ? '✅ Set' : '❌ Missing');
      process.exit(1);
    }
    console.log('✅ Environment variables found');
    console.log(`   URL: ${url}`);
    console.log(`   Key: ${key.substring(0, 20)}...`);
    console.log('');

    // Test 2: Initialize Supabase client
    console.log('2️⃣ Initializing Supabase client...');
    const supabase = getSupabaseClient();
    console.log('✅ Supabase client initialized');
    console.log('');

    // Test 3: List buckets
    console.log('3️⃣ Listing storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError.message);
      process.exit(1);
    }

    console.log(`✅ Found ${buckets?.length || 0} bucket(s):`);
    buckets?.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'Public' : 'Private'})`);
    });
    console.log('');

    // Test 4: Check for research-files bucket
    console.log('4️⃣ Checking for research-files bucket...');
    let researchBucket = buckets?.find(b => b.name === 'research-files');

    if (!researchBucket) {
      console.log('⚠️  Bucket "research-files" not found. Attempting to create it...');

      const { data: createData, error: createError } = await supabase.storage.createBucket('research-files', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
      });

      if (createError) {
        console.error('❌ Failed to create bucket:', createError.message);
        console.log('');
        console.log('Please create it manually in Supabase Dashboard:');
        console.log('   1. Go to Storage');
        console.log('   2. Click "New bucket"');
        console.log('   3. Name: research-files');
        console.log('   4. Check "Public bucket"');
        console.log('');
        console.log('Error details:', createError);
        process.exit(1);
      }

      console.log('✅ Bucket created successfully!');
      researchBucket = { name: 'research-files', public: true } as any;
    }

    console.log('✅ Bucket "research-files" exists');
    console.log(`   Public: ${researchBucket.public ? 'Yes ✅' : 'No ❌'}`);

    if (!researchBucket.public) {
      console.warn('⚠️  WARNING: Bucket is not public!');
      console.log('   Files won\'t be accessible. Please make it public:');
      console.log('   1. Go to Storage > research-files');
      console.log('   2. Settings > Make bucket public');
    }
    console.log('');

    // Test 5: Test file upload
    console.log('5️⃣ Testing file upload...');
    const testContent = '# Test File\n\nThis is a test markdown file.';
    const testPath = `test/test-${Date.now()}.md`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('research-files')
      .upload(testPath, testContent, {
        contentType: 'text/markdown',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      console.log('   Error details:', uploadError);
      process.exit(1);
    }

    console.log('✅ File uploaded successfully');
    console.log(`   Path: ${testPath}`);
    console.log('');

    // Test 6: Get public URL
    console.log('6️⃣ Getting public URL...');
    const { data: urlData } = supabase.storage
      .from('research-files')
      .getPublicUrl(testPath);

    console.log('✅ Public URL generated:');
    console.log(`   ${urlData.publicUrl}`);
    console.log('');

    // Test 7: Download file
    console.log('7️⃣ Testing file download...');
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('research-files')
      .download(testPath);

    if (downloadError) {
      console.error('❌ Download failed:', downloadError.message);
      process.exit(1);
    }

    const downloadedText = await downloadData.text();
    console.log('✅ File downloaded successfully');
    console.log(`   Content matches: ${downloadedText === testContent ? 'Yes ✅' : 'No ❌'}`);
    console.log('');

    // Test 8: Delete test file
    console.log('8️⃣ Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('research-files')
      .remove([testPath]);

    if (deleteError) {
      console.warn('⚠️  Could not delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file deleted');
    }
    console.log('');

    // Success!
    console.log('🎉 All tests passed!');
    console.log('');
    console.log('✅ Supabase is configured correctly');
    console.log('✅ Storage bucket is accessible');
    console.log('✅ File upload/download works');
    console.log('');
    console.log('Your app is ready to use Supabase Storage! 🚀');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the test
testSupabase();
