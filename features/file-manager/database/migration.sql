-- =====================================================
-- BioDocs AI - File Manager Database Migration
-- Run this in Supabase Dashboard > SQL Editor
-- =====================================================
-- This creates tables that match the Prisma schema
-- Run this SQL, then run: npx prisma generate
-- =====================================================

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- 1. FILE COLLECTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS file_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3b82f6',
    icon TEXT DEFAULT 'folder',
    is_smart BOOLEAN DEFAULT false,
    smart_filter JSONB,
    file_count INTEGER DEFAULT 0,
    -- Share link fields
    share_link TEXT UNIQUE,
    share_link_enabled BOOLEAN DEFAULT false,
    share_link_access TEXT DEFAULT 'public' CHECK (share_link_access IN ('public', 'login')),
    share_link_role TEXT DEFAULT 'viewer' CHECK (share_link_role IN ('viewer', 'editor')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add share_link columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_collections' AND column_name = 'share_link') THEN
        ALTER TABLE file_collections ADD COLUMN share_link TEXT UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_collections' AND column_name = 'share_link_enabled') THEN
        ALTER TABLE file_collections ADD COLUMN share_link_enabled BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_collections' AND column_name = 'share_link_access') THEN
        ALTER TABLE file_collections ADD COLUMN share_link_access TEXT DEFAULT 'public';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'file_collections' AND column_name = 'share_link_role') THEN
        ALTER TABLE file_collections ADD COLUMN share_link_role TEXT DEFAULT 'viewer';
    END IF;
END $$;

-- Indexes for collections
CREATE INDEX IF NOT EXISTS idx_file_collections_user ON file_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_file_collections_name ON file_collections(user_id, name);
CREATE INDEX IF NOT EXISTS idx_file_collections_share_link ON file_collections(share_link);

-- =====================================================
-- 2. USER FILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    collection_id UUID,
    
    -- File info
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_key TEXT,
    storage_provider TEXT DEFAULT 'wasabi',
    file_type TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER NOT NULL DEFAULT 0,
    thumbnail_url TEXT,
    
    -- Processing status
    status TEXT DEFAULT 'ready' CHECK (status IN ('uploading', 'processing', 'indexed', 'ready', 'error')),
    processing_error TEXT,
    is_indexed BOOLEAN DEFAULT false,
    
    -- Content extraction
    extracted_text TEXT,
    page_count INTEGER,
    word_count INTEGER,
    
    -- AI-generated metadata
    ai_summary TEXT,
    ai_category TEXT,
    
    -- User metadata
    is_favorite BOOLEAN DEFAULT false,
    is_generated BOOLEAN DEFAULT false,
    source_feature TEXT,
    
    -- Timestamps
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT "user_files_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES file_collections(id) ON DELETE SET NULL
);

-- Indexes for files
CREATE INDEX IF NOT EXISTS idx_user_files_user ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_collection ON user_files(collection_id);
CREATE INDEX IF NOT EXISTS idx_user_files_type ON user_files(file_type);
CREATE INDEX IF NOT EXISTS idx_user_files_favorite ON user_files(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_user_files_created ON user_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_files_storage_provider ON user_files(storage_provider);
CREATE INDEX IF NOT EXISTS idx_user_files_file_key ON user_files(file_key);

-- =====================================================
-- 3. FILE COLLECTION FILES (Many-to-Many Junction)
-- =====================================================
CREATE TABLE IF NOT EXISTS file_collection_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    collection_id UUID NOT NULL,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT "file_collection_files_file_id_fkey" FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE,
    CONSTRAINT "file_collection_files_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES file_collections(id) ON DELETE CASCADE,
    UNIQUE(file_id, collection_id)
);

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS idx_file_collection_files_file ON file_collection_files(file_id);
CREATE INDEX IF NOT EXISTS idx_file_collection_files_collection ON file_collection_files(collection_id);

-- =====================================================
-- 4. FILE TAGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS file_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    tag_name TEXT NOT NULL,
    tag_type TEXT DEFAULT 'manual',
    confidence FLOAT DEFAULT 1.0,
    color TEXT DEFAULT '#6b7280',
    is_ai_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT "file_tags_file_id_fkey" FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE,
    UNIQUE(file_id, tag_name)
);

-- Indexes for tags
CREATE INDEX IF NOT EXISTS idx_file_tags_file ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_tags_name ON file_tags(tag_name);

-- =====================================================
-- 5. FILE CHUNKS TABLE (For RAG/Embeddings)
-- =====================================================
CREATE TABLE IF NOT EXISTS file_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    start_position INTEGER,
    end_position INTEGER,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT "file_chunks_file_id_fkey" FOREIGN KEY (file_id) REFERENCES user_files(id) ON DELETE CASCADE
);

-- Indexes for chunks
CREATE INDEX IF NOT EXISTS idx_file_chunks_file ON file_chunks(file_id);

-- =====================================================
-- 6. COLLECTION MEMBERS TABLE (Sharing with users)
-- =====================================================
CREATE TABLE IF NOT EXISTS collection_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL,
    user_id TEXT,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    invited_by TEXT NOT NULL,
    invited_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT "collection_members_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES file_collections(id) ON DELETE CASCADE,
    UNIQUE(collection_id, email)
);

-- Indexes for members
CREATE INDEX IF NOT EXISTS idx_collection_members_collection ON collection_members(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_members_user ON collection_members(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_members_email ON collection_members(email);
CREATE INDEX IF NOT EXISTS idx_collection_members_status ON collection_members(status);

-- =====================================================
-- 7. COLLECTION PRESENCE TABLE (Real-time tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS collection_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL,
    user_id TEXT NOT NULL,
    user_email TEXT,
    user_name TEXT,
    user_avatar TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    CONSTRAINT "collection_presence_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES file_collections(id) ON DELETE CASCADE,
    UNIQUE(collection_id, user_id)
);

-- Indexes for presence
CREATE INDEX IF NOT EXISTS idx_collection_presence_collection ON collection_presence(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_presence_active ON collection_presence(collection_id, is_active);

-- =====================================================
-- 8. SHARED COLLECTION LINKS TABLE (Legacy - optional)
-- =====================================================
CREATE TABLE IF NOT EXISTS shared_collection_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL UNIQUE,
    share_link TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    access_type TEXT DEFAULT 'public' CHECK (access_type IN ('public', 'login')),
    role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor')),
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT "shared_collection_links_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES file_collections(id) ON DELETE CASCADE
);

-- Indexes for links
CREATE INDEX IF NOT EXISTS idx_shared_collection_links_link ON shared_collection_links(share_link);
CREATE INDEX IF NOT EXISTS idx_shared_collection_links_collection ON shared_collection_links(collection_id);

-- =====================================================
-- 9. FUNCTIONS
-- =====================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_user_files_updated_at ON user_files;
CREATE TRIGGER trigger_user_files_updated_at
    BEFORE UPDATE ON user_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_file_collections_updated_at ON file_collections;
CREATE TRIGGER trigger_file_collections_updated_at
    BEFORE UPDATE ON file_collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to update file_count in collections (via junction table)
CREATE OR REPLACE FUNCTION update_collection_file_count_junction()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE file_collections 
        SET file_count = (
            SELECT COUNT(*) FROM file_collection_files 
            WHERE collection_id = NEW.collection_id
        ), updated_at = NOW()
        WHERE id = NEW.collection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE file_collections 
        SET file_count = (
            SELECT COUNT(*) FROM file_collection_files 
            WHERE collection_id = OLD.collection_id
        ), updated_at = NOW()
        WHERE id = OLD.collection_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for file count via junction table
DROP TRIGGER IF EXISTS trigger_update_collection_file_count_junction ON file_collection_files;
CREATE TRIGGER trigger_update_collection_file_count_junction
    AFTER INSERT OR DELETE ON file_collection_files
    FOR EACH ROW EXECUTE FUNCTION update_collection_file_count_junction();

-- Semantic search function
CREATE OR REPLACE FUNCTION match_file_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  file_id uuid,
  chunk_index int,
  content text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    fc.id,
    fc.file_id,
    fc.chunk_index,
    fc.content,
    1 - (fc.embedding <=> query_embedding) as similarity
  FROM file_chunks fc
  INNER JOIN user_files uf ON fc.file_id = uf.id
  WHERE 
    (p_user_id IS NULL OR uf.user_id = p_user_id)
    AND 1 - (fc.embedding <=> query_embedding) > match_threshold
  ORDER BY fc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- =====================================================
-- 10. ROW LEVEL SECURITY (Optional - enable if needed)
-- =====================================================

-- Enable RLS on tables (uncomment if you want RLS)
-- ALTER TABLE file_collections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_files ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE file_tags ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE file_chunks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE collection_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE collection_presence ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DONE! Run this SQL in Supabase Dashboard > SQL Editor
-- =====================================================
