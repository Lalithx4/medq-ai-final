-- =====================================================
-- PDF Chat RAG - Additional Setup (Run AFTER Prisma migrate)
-- This file contains pgvector extension and custom functions
-- =====================================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable pg_trgm for keyword search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create IVFFlat index on embeddings for faster similarity search
-- Note: Run this AFTER you have some data (at least 1000 rows)
-- CREATE INDEX IF NOT EXISTS medical_chunks_embedding_idx 
-- ON "MedicalChunk" USING ivfflat (embedding vector_cosine_ops) 
-- WITH (lists = 100);

-- For now, use a simpler index that works with any amount of data
CREATE INDEX IF NOT EXISTS medical_chunks_embedding_idx 
ON "MedicalChunk" USING hnsw (embedding vector_cosine_ops);

-- Create GIN index for trigram text search
CREATE INDEX IF NOT EXISTS medical_chunks_text_trgm_idx 
ON "MedicalChunk" USING gin ("chunkText" gin_trgm_ops);

-- =====================================================
-- Hybrid Search Function
-- Combines semantic (vector) and keyword (trigram) search
-- =====================================================

CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(768),
    query_text TEXT,
    doc_id UUID,
    user_id_param TEXT,
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
            mc."chunkText" as chunk_text,
            mc."pageNumber" as page_number,
            1 - (mc.embedding <=> query_embedding) as similarity
        FROM "MedicalChunk" mc
        WHERE mc."documentId" = doc_id
        AND mc."userId" = user_id_param
        ORDER BY mc.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT 
            mc.id,
            similarity(mc."chunkText", query_text) as keyword_score
        FROM "MedicalChunk" mc
        WHERE mc."documentId" = doc_id
        AND mc."userId" = user_id_param
        AND mc."chunkText" % query_text
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

-- =====================================================
-- Row Level Security (RLS) Policies
-- Note: Prisma doesn't generate RLS, so we add it manually
-- =====================================================

-- Enable RLS on all PDF Chat tables
ALTER TABLE "PdfDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalEntity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PdfChatSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PdfChatMessage" ENABLE ROW LEVEL SECURITY;

-- PdfDocument policies
CREATE POLICY "Users can view their own documents"
ON "PdfDocument" FOR SELECT
USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own documents"
ON "PdfDocument" FOR INSERT
WITH CHECK ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own documents"
ON "PdfDocument" FOR UPDATE
USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own documents"
ON "PdfDocument" FOR DELETE
USING ("userId" = current_setting('app.current_user_id', true));

-- MedicalChunk policies
CREATE POLICY "Users can view their own chunks"
ON "MedicalChunk" FOR SELECT
USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Service role can insert chunks"
ON "MedicalChunk" FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own chunks"
ON "MedicalChunk" FOR DELETE
USING ("userId" = current_setting('app.current_user_id', true));

-- MedicalEntity policies
CREATE POLICY "Users can view their own entities"
ON "MedicalEntity" FOR SELECT
USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Service role can insert entities"
ON "MedicalEntity" FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own entities"
ON "MedicalEntity" FOR DELETE
USING ("userId" = current_setting('app.current_user_id', true));

-- PdfChatSession policies
CREATE POLICY "Users can view their own sessions"
ON "PdfChatSession" FOR SELECT
USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own sessions"
ON "PdfChatSession" FOR INSERT
WITH CHECK ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own sessions"
ON "PdfChatSession" FOR UPDATE
USING ("userId" = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own sessions"
ON "PdfChatSession" FOR DELETE
USING ("userId" = current_setting('app.current_user_id', true));

-- PdfChatMessage policies (via session ownership)
CREATE POLICY "Users can view messages in their sessions"
ON "PdfChatMessage" FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM "PdfChatSession" 
        WHERE "PdfChatSession".id = "PdfChatMessage"."sessionId" 
        AND "PdfChatSession"."userId" = current_setting('app.current_user_id', true)
    )
);

CREATE POLICY "Users can insert messages in their sessions"
ON "PdfChatMessage" FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM "PdfChatSession" 
        WHERE "PdfChatSession".id = "PdfChatMessage"."sessionId" 
        AND "PdfChatSession"."userId" = current_setting('app.current_user_id', true)
    )
);

CREATE POLICY "Service role can insert messages"
ON "PdfChatMessage" FOR INSERT
WITH CHECK (true);

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON TABLE "PdfDocument" IS 'Stores PDF document metadata';
COMMENT ON TABLE "MedicalChunk" IS 'Stores document chunks with embeddings for RAG';
COMMENT ON TABLE "MedicalEntity" IS 'Stores extracted medical entities (diseases, drugs, etc.)';
COMMENT ON TABLE "PdfChatSession" IS 'Chat sessions for each document';
COMMENT ON TABLE "PdfChatMessage" IS 'Chat messages with AI responses and citations';

COMMENT ON COLUMN "MedicalChunk".embedding IS 'PubMedBERT 768-dimensional vector embedding';
COMMENT ON COLUMN "MedicalChunk"."userId" IS 'Enforces user data isolation';
COMMENT ON COLUMN "MedicalEntity"."userId" IS 'Enforces user data isolation';
