-- Semantic Search Function for File Chunks
-- This function matches file chunks using pgvector cosine similarity
-- Must be run in Supabase SQL editor

-- Create the semantic search function
CREATE OR REPLACE FUNCTION match_file_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_file_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_file_chunks TO service_role;

-- Index for faster similarity search (if not already created)
CREATE INDEX IF NOT EXISTS idx_file_chunks_embedding 
ON file_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Additional helper function to get files by similarity
CREATE OR REPLACE FUNCTION search_files_by_content(
  search_query text,
  p_user_id uuid,
  result_limit int DEFAULT 10
)
RETURNS TABLE (
  file_id uuid,
  filename text,
  file_type text,
  file_url text,
  is_generated boolean,
  relevance_score float
)
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  query_embedding vector(768);
BEGIN
  -- Note: In production, you would generate the embedding via an API call
  -- This function expects the embedding to be passed directly
  -- For now, it does a text-based search as fallback
  
  RETURN QUERY
  SELECT DISTINCT
    uf.id as file_id,
    uf.filename,
    uf.file_type,
    uf.file_url,
    uf.is_generated,
    CASE 
      WHEN uf.filename ILIKE '%' || search_query || '%' THEN 1.0
      WHEN uf.original_name ILIKE '%' || search_query || '%' THEN 0.9
      ELSE 0.5
    END::float as relevance_score
  FROM user_files uf
  LEFT JOIN file_tags ft ON uf.id = ft.file_id
  WHERE 
    uf.user_id = p_user_id
    AND (
      uf.filename ILIKE '%' || search_query || '%'
      OR uf.original_name ILIKE '%' || search_query || '%'
      OR ft.tag_name ILIKE '%' || search_query || '%'
    )
  ORDER BY relevance_score DESC
  LIMIT result_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_files_by_content TO authenticated;
GRANT EXECUTE ON FUNCTION search_files_by_content TO service_role;
