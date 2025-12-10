-- =====================================================
-- PDF Chat - User Isolation Fix
-- Add user_id columns and update RLS policies
-- =====================================================

-- Add user_id to medical_chunks
ALTER TABLE medical_chunks 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to medical_entities
ALTER TABLE medical_entities 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS medical_chunks_user_id_idx ON medical_chunks(user_id);
CREATE INDEX IF NOT EXISTS medical_entities_user_id_idx ON medical_entities(user_id);

-- Drop old RLS policies
DROP POLICY IF EXISTS "Users can view chunks of their documents" ON medical_chunks;
DROP POLICY IF EXISTS "Service role can insert chunks" ON medical_chunks;
DROP POLICY IF EXISTS "Users can view entities of their documents" ON medical_entities;
DROP POLICY IF EXISTS "Service role can insert entities" ON medical_entities;

-- Create new RLS policies for medical_chunks
CREATE POLICY "Users can view their own chunks"
ON medical_chunks FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own chunks"
ON medical_chunks FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert any chunks"
ON medical_chunks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own chunks"
ON medical_chunks FOR DELETE
USING (user_id = auth.uid());

-- Create new RLS policies for medical_entities
CREATE POLICY "Users can view their own entities"
ON medical_entities FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own entities"
ON medical_entities FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert any entities"
ON medical_entities FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own entities"
ON medical_entities FOR DELETE
USING (user_id = auth.uid());

-- Update hybrid_search function to include user_id filter
CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(768),
    query_text TEXT,
    doc_id UUID,
    user_id_param UUID,
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5,
    semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    chunk_text TEXT,
    page_number INTEGER,
    similarity FLOAT,
    keyword_score FLOAT,
    combined_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT 
            mc.id,
            mc.chunk_text,
            mc.page_number,
            1 - (mc.embedding <=> query_embedding) as similarity
        FROM medical_chunks mc
        WHERE mc.document_id = doc_id
        AND mc.user_id = user_id_param
        ORDER BY mc.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT 
            mc.id,
            similarity(mc.chunk_text, query_text) as keyword_score
        FROM medical_chunks mc
        WHERE mc.document_id = doc_id
        AND mc.user_id = user_id_param
        AND mc.chunk_text % query_text
    )
    SELECT 
        ss.id,
        ss.chunk_text,
        ss.page_number,
        ss.similarity,
        COALESCE(ks.keyword_score, 0.0) as keyword_score,
        (semantic_weight * ss.similarity + (1 - semantic_weight) * COALESCE(ks.keyword_score, 0.0)) as combined_score
    FROM semantic_search ss
    LEFT JOIN keyword_search ks ON ss.id = ks.id
    WHERE ss.similarity >= match_threshold
    ORDER BY combined_score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing data (if any) - set to first user or delete
-- WARNING: This will assign all existing chunks to the first user found
-- If you want to delete existing data instead, uncomment the DELETE lines

-- Option 1: Assign to first user (if you have test data to keep)
DO $$
DECLARE
    first_user_id UUID;
BEGIN
    -- Get first user ID
    SELECT id INTO first_user_id FROM auth.users LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
        -- Update chunks
        UPDATE medical_chunks 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
        
        -- Update entities
        UPDATE medical_entities 
        SET user_id = first_user_id 
        WHERE user_id IS NULL;
        
        RAISE NOTICE 'Assigned % chunks and % entities to user %', 
            (SELECT COUNT(*) FROM medical_chunks WHERE user_id = first_user_id),
            (SELECT COUNT(*) FROM medical_entities WHERE user_id = first_user_id),
            first_user_id;
    END IF;
END $$;

-- Option 2: Delete orphaned data (uncomment if you want clean slate)
-- DELETE FROM medical_chunks WHERE user_id IS NULL;
-- DELETE FROM medical_entities WHERE user_id IS NULL;

-- Make user_id NOT NULL after backfill
ALTER TABLE medical_chunks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE medical_entities ALTER COLUMN user_id SET NOT NULL;

-- Add comment
COMMENT ON COLUMN medical_chunks.user_id IS 'User who owns this chunk - enforces data isolation';
COMMENT ON COLUMN medical_entities.user_id IS 'User who owns this entity - enforces data isolation';
