/**
 * Setup Supabase Storage Bucket
 * Run this once to create the required storage bucket
 */

import { getSupabaseClient } from '@/lib/supabaseClient';

async function setupStorage() {
  console.log('🚀 Setting up Supabase Storage...\n');

  try {
    const supabase = getSupabaseClient();

    // Check if bucket exists
    console.log('📋 Checking existing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const bucketName = 'research-files';
    const bucketExists = buckets?.some(b => b.name === bucketName);

    if (bucketExists) {
      console.log(`✅ Bucket '${bucketName}' already exists!`);
      console.log('\n✨ Storage is ready to use!\n');
      return;
    }

    // Create bucket
    console.log(`📦 Creating bucket '${bucketName}'...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true, // Make files publicly accessible
      fileSizeLimit: 52428800, // 50MB limit
      allowedMimeTypes: [
        'text/markdown',
        'text/plain',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ]
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      console.log('\n💡 Please create the bucket manually in Supabase Dashboard:');
      console.log('   1. Go to Storage');
      console.log('   2. Click "New bucket"');
      console.log('   3. Name: research-files');
      console.log('   4. Check "Public bucket"');
      console.log('   5. Click "Create"\n');
      process.exit(1);
    }

    console.log(`✅ Bucket '${bucketName}' created successfully!`);
    console.log('\n📁 Bucket Configuration:');
    console.log('   - Name: research-files');
    console.log('   - Public: Yes');
    console.log('   - Size Limit: 50MB');
    console.log('   - Allowed Types: Markdown, PDF, Word, Images');
    console.log('\n✨ Storage is ready to use!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Run the setup
setupStorage();
