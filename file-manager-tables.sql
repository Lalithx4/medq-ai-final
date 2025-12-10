-- File Manager Tables for Supabase
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/edxijcfybryqcffokimr/sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Files table
CREATE TABLE IF NOT EXISTS user_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  file_url TEXT NOT NULL,
  file_key TEXT,
  thumbnail_url TEXT,
  is_generated BOOLEAN DEFAULT false,
  source_feature TEXT,
  source_id TEXT,
  is_favorite BOOLEAN DEFAULT false,
  is_indexed BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Collections table
CREATE TABLE IF NOT EXISTS file_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Tags table
CREATE TABLE IF NOT EXISTS file_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES user_files(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  tag_type TEXT DEFAULT 'general',
  confidence FLOAT DEFAULT 1.0,
  color TEXT,
  is_ai_generated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- File Collection Files (junction table)
CREATE TABLE IF NOT EXISTS file_collection_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES user_files(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES file_collections(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, collection_id)
);

-- File Chunks for vector search (requires pgvector extension)
-- First enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS file_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_id UUID NOT NULL REFERENCES user_files(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  start_position INTEGER,
  end_position INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_files_user_id ON user_files(user_id);
CREATE INDEX IF NOT EXISTS idx_user_files_created_at ON user_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_tags_file_id ON file_tags(file_id);
CREATE INDEX IF NOT EXISTS idx_file_collections_user_id ON file_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_file_collection_files_file_id ON file_collection_files(file_id);
CREATE INDEX IF NOT EXISTS idx_file_collection_files_collection_id ON file_collection_files(collection_id);
CREATE INDEX IF NOT EXISTS idx_file_chunks_file_id ON file_chunks(file_id);

-- Function for semantic search
CREATE OR REPLACE FUNCTION match_file_chunks(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
RETURNS TABLE (
  file_id uuid,
  chunk_index int,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fc.file_id,
    fc.chunk_index,
    fc.content,
    1 - (fc.embedding <=> query_embedding) as similarity
  FROM file_chunks fc
  JOIN user_files uf ON fc.file_id = uf.id
  WHERE uf.user_id = p_user_id
    AND 1 - (fc.embedding <=> query_embedding) > match_threshold
  ORDER BY fc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
