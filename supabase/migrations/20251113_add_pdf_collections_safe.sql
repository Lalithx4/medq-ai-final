-- Add PDF Collections for multi-document chat (SAFE VERSION)
-- This migration is idempotent and can be run multiple times

-- Create pdf_collections table
CREATE TABLE IF NOT EXISTS pdf_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    file_search_store_id TEXT, -- Gemini File Search Store ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_collection_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add collection_id to pdf_documents
ALTER TABLE pdf_documents 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES pdf_collections(id) ON DELETE SET NULL;

-- Add collection_id to pdf_chat_sessions
ALTER TABLE pdf_chat_sessions
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES pdf_collections(id) ON DELETE CASCADE;

-- Make document_id optional (only if it's currently NOT NULL)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'pdf_chat_sessions' 
        AND column_name = 'document_id' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE pdf_chat_sessions ALTER COLUMN document_id DROP NOT NULL;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS pdf_collections_user_id_idx ON pdf_collections(user_id);
CREATE INDEX IF NOT EXISTS pdf_collections_created_at_idx ON pdf_collections(created_at);
CREATE INDEX IF NOT EXISTS pdf_documents_collection_id_idx ON pdf_documents(collection_id);
CREATE INDEX IF NOT EXISTS pdf_chat_sessions_collection_id_idx ON pdf_chat_sessions(collection_id);

-- Enable RLS on pdf_collections
ALTER TABLE pdf_collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view their own collections" ON pdf_collections;
CREATE POLICY "Users can view their own collections"
ON pdf_collections FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own collections" ON pdf_collections;
CREATE POLICY "Users can create their own collections"
ON pdf_collections FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own collections" ON pdf_collections;
CREATE POLICY "Users can update their own collections"
ON pdf_collections FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own collections" ON pdf_collections;
CREATE POLICY "Users can delete their own collections"
ON pdf_collections FOR DELETE
USING (auth.uid() = user_id);

-- Create or replace update trigger
DROP TRIGGER IF EXISTS update_pdf_collections_updated_at ON pdf_collections;
CREATE TRIGGER update_pdf_collections_updated_at
    BEFORE UPDATE ON pdf_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
