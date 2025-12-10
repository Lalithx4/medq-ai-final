/**
 * Supabase Storage Service
 * Handles all file uploads to Supabase Storage
 */

import { getSupabaseClient } from '@/lib/supabaseClient';

export class SupabaseStorageService {
  private _client: ReturnType<typeof getSupabaseClient> | null = null;
  // Lazy getter so env vars are only read at runtime, not at build/import time
  private get client() {
    if (!this._client) {
      this._client = getSupabaseClient();
    }
    return this._client;
  }
  private bucketName = 'research-files'; // Main bucket for all files

  /**
   * Upload markdown file to Supabase Storage
   */
  async uploadMarkdownFile(
    userId: string,
    filename: string,
    content: string,
    folder: 'deep-research' | 'research-paper' | 'documents' = 'deep-research'
  ): Promise<{ path: string; url: string }> {
    const filePath = `${folder}/${userId}/${filename}`;
    
    console.log(`📤 Uploading to Supabase Storage...`);
    console.log(`   Bucket: ${this.bucketName}`);
    console.log(`   Path: ${filePath}`);
    console.log(`   Content size: ${content.length} bytes`);
    
    // Convert string to Blob for upload
    const blob = new Blob([content], { type: 'text/markdown' });
    
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(filePath, blob, {
        contentType: 'text/markdown',
        upsert: true, // Allow overwriting
        cacheControl: '3600',
      });

    if (error) {
      console.error('❌ Supabase upload error:', error);
      console.error('   File path:', filePath);
      console.error('   Bucket:', this.bucketName);
      console.error('   Error code:', error.name);
      console.error('   Error message:', error.message);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    console.log(`✅ Uploaded to Supabase: ${filePath}`);
    console.log(`📎 Public URL: ${urlData.publicUrl}`);

    return {
      path: filePath,
      url: urlData.publicUrl,
    };
  }

  /**
   * Download file from Supabase Storage
   */
  async downloadFile(filePath: string): Promise<string> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .download(filePath);

    if (error) {
      console.error('Supabase download error:', error);
      throw new Error(`Failed to download file: ${error.message}`);
    }

    // Convert Blob to text
    const text = await data.text();
    return text;
  }

  /**
   * Delete file from Supabase Storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }

    console.log(`🗑️ Deleted from Supabase: ${filePath}`);
  }

  /**
   * List files for a user
   */
  async listUserFiles(
    userId: string,
    folder: 'deep-research' | 'research-paper' | 'documents' = 'deep-research'
  ): Promise<string[]> {
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .list(`${folder}/${userId}`);

    if (error) {
      console.error('Supabase list error:', error);
      throw new Error(`Failed to list files: ${error.message}`);
    }

    return data.map(file => `${folder}/${userId}/${file.name}`);
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(filePath: string): string {
    const { data } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Upload any file (images, PDFs, etc.)
   */
  async uploadFile(
    userId: string,
    filename: string,
    file: Buffer | Blob,
    contentType: string,
    folder: string = 'uploads'
  ): Promise<{ path: string; url: string }> {
    const filePath = `${folder}/${userId}/${filename}`;
    
    const { data, error } = await this.client.storage
      .from(this.bucketName)
      .upload(filePath, file, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    const { data: urlData } = this.client.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return {
      path: filePath,
      url: urlData.publicUrl,
    };
  }

  /**
   * Check if bucket exists, create if not
   */
  async ensureBucketExists(): Promise<void> {
    const { data: buckets } = await this.client.storage.listBuckets();
    
    const bucketExists = buckets?.some(b => b.name === this.bucketName);
    
    if (!bucketExists) {
      const { error } = await this.client.storage.createBucket(this.bucketName, {
        public: true, // Make files publicly accessible
        fileSizeLimit: 52428800, // 50MB limit
      });

      if (error) {
        console.error('Failed to create bucket:', error);
        throw new Error(`Failed to create bucket: ${error.message}`);
      }

      console.log(`✅ Created Supabase bucket: ${this.bucketName}`);
    }
  }

  /**
   * Generate a safe filename
   */
  sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 100);
  }

  /**
   * Generate timestamped filename
   */
  generateFilename(topic: string, extension: string = 'md'): string {
    const sanitized = this.sanitizeFilename(topic);
    const timestamp = Date.now();
    return `${sanitized}_${timestamp}.${extension}`;
  }
}

// Export singleton instance
export const supabaseStorage = new SupabaseStorageService();
