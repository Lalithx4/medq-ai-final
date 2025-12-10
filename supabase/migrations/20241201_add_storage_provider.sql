-- Migration: Add storage_provider and file_key columns to user_files
-- This allows tracking which storage service is used for each file
-- and stores the storage key/path for Wasabi files

-- Add file_key column (for Wasabi object key like users/{userId}/files/...)
ALTER TABLE user_files 
ADD COLUMN IF NOT EXISTS file_key TEXT;

-- Add storage_provider column
ALTER TABLE user_files 
ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'wasabi';

-- Add index for faster queries by storage provider
CREATE INDEX IF NOT EXISTS idx_user_files_storage_provider 
ON user_files(storage_provider);

-- Add index for file_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_files_file_key 
ON user_files(file_key);

-- Update comment
COMMENT ON COLUMN user_files.storage_provider IS 'Storage service used: wasabi, uploadthing, or supabase';
COMMENT ON COLUMN user_files.file_key IS 'Storage key/path in the storage provider (e.g., users/{userId}/files/...)';

-- Optional: Update existing records to mark them as uploadthing (legacy files)
UPDATE user_files 
SET storage_provider = 'uploadthing' 
WHERE storage_provider IS NULL 
  AND file_url IS NOT NULL 
  AND (file_url LIKE '%uploadthing%' OR file_url LIKE '%utfs.io%');
