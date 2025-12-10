-- =====================================================
-- Medical RAG System - Complete Supabase Schema
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- TABLES
-- =====================================================

-- Medical Documents Table
CREATE TABLE IF NOT EXISTS medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL DEFAULT 'default_user',
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    file_hash TEXT UNIQUE,
    local_file_path TEXT,
    upload_date TIMESTAMPTZ DEFAULT NOW(),
    processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document Chunks with Embeddings (768 dimensions for PubMedBERT)
CREATE TABLE IF NOT EXISTS medical_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES medical_documents(id) ON DELETE CASCADE,
    chunk_idx INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    page_number INTEGER,
    chunk_type TEXT DEFAULT 'text',
    token_count INTEGER,
    embedding vector(768), -- PubMedBERT dimension
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medical Entities Table
CREATE TABLE IF NOT EXISTS medical_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES medical_documents(id) ON DELETE CASCADE,
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_text TEXT,
    start_char INTEGER,
    end_char INTEGER,
    confidence_score FLOAT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat History Table (optional)
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    document_id UUID REFERENCES medical_documents(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    answer TEXT,
    citations JSONB,
    confidence_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Vector similarity search index (IVFFlat)
CREATE INDEX IF NOT EXISTS medical_chunks_embedding_idx 
ON medical_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Text search indexes
CREATE INDEX IF NOT EXISTS medical_chunks_text_idx 
ON medical_chunks USING gin(to_tsvector('english', chunk_text));

-- Regular indexes
CREATE INDEX IF NOT EXISTS medical_documents_user_id_idx ON medical_documents(user_id);
CREATE INDEX IF NOT EXISTS medical_documents_file_hash_idx ON medical_documents(file_hash);
CREATE INDEX IF NOT EXISTS medical_chunks_document_id_idx ON medical_chunks(document_id);
CREATE INDEX IF NOT EXISTS medical_entities_document_id_idx ON medical_entities(document_id);
CREATE INDEX IF NOT EXISTS medical_entities_type_idx ON medical_entities(entity_type);
CREATE INDEX IF NOT EXISTS chat_history_user_id_idx ON chat_history(user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create document record
CREATE OR REPLACE FUNCTION create_document_record(
    p_user_id TEXT,
    p_filename TEXT,
    p_original_filename TEXT,
    p_file_type TEXT,
    p_file_size INTEGER,
    p_file_hash TEXT,
    p_local_file_path TEXT
) RETURNS UUID AS $$
DECLARE
    v_document_id UUID;
BEGIN
    INSERT INTO medical_documents (
        user_id, filename, original_filename, file_type, 
        file_size, file_hash, local_file_path, processing_status
    ) VALUES (
        p_user_id, p_filename, p_original_filename, p_file_type,
        p_file_size, p_file_hash, p_local_file_path, 'processing'
    ) RETURNING id INTO v_document_id;
    
    RETURN v_document_id;
END;
$$ LANGUAGE plpgsql;

-- Function to add document chunks
CREATE OR REPLACE FUNCTION add_document_chunks(
    p_document_id UUID,
    p_chunks JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    chunk JSONB;
BEGIN
    FOR chunk IN SELECT * FROM jsonb_array_elements(p_chunks)
    LOOP
        INSERT INTO medical_chunks (
            document_id, chunk_idx, chunk_text, page_number,
            chunk_type, token_count, embedding, metadata
        ) VALUES (
            p_document_id,
            (chunk->>'chunk_idx')::INTEGER,
            chunk->>'text',
            (chunk->>'page_number')::INTEGER,
            chunk->>'type',
            (chunk->>'token_count')::INTEGER,
            (chunk->>'embedding')::vector(768),
            COALESCE(chunk->'metadata', '{}'::jsonb)
        );
    END LOOP;
    
    -- Update document status
    UPDATE medical_documents 
    SET processing_status = 'completed', updated_at = NOW()
    WHERE id = p_document_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Hybrid search function (semantic + keyword)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_text TEXT,
    query_embedding vector(768),
    match_threshold FLOAT DEFAULT 0.3,
    match_count INT DEFAULT 5,
    semantic_weight FLOAT DEFAULT 0.7,
    user_id_filter TEXT DEFAULT NULL
) RETURNS TABLE (
    document_id UUID,
    filename TEXT,
    chunk_text TEXT,
    page_number INTEGER,
    similarity FLOAT,
    keyword_score FLOAT,
    hybrid_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT 
            mc.document_id,
            md.filename,
            mc.chunk_text,
            mc.page_number,
            1 - (mc.embedding <=> query_embedding) as similarity
        FROM medical_chunks mc
        JOIN medical_documents md ON mc.document_id = md.id
        WHERE (user_id_filter IS NULL OR md.user_id = user_id_filter)
        AND 1 - (mc.embedding <=> query_embedding) > match_threshold
    ),
    keyword_search AS (
        SELECT 
            mc.document_id,
            md.filename,
            mc.chunk_text,
            mc.page_number,
            ts_rank(to_tsvector('english', mc.chunk_text), 
                    plainto_tsquery('english', query_text)) as keyword_score
        FROM medical_chunks mc
        JOIN medical_documents md ON mc.document_id = md.id
        WHERE (user_id_filter IS NULL OR md.user_id = user_id_filter)
        AND to_tsvector('english', mc.chunk_text) @@ plainto_tsquery('english', query_text)
    )
    SELECT 
        COALESCE(s.document_id, k.document_id) as document_id,
        COALESCE(s.filename, k.filename) as filename,
        COALESCE(s.chunk_text, k.chunk_text) as chunk_text,
        COALESCE(s.page_number, k.page_number) as page_number,
        COALESCE(s.similarity, 0.0) as similarity,
        COALESCE(k.keyword_score, 0.0) as keyword_score,
        (COALESCE(s.similarity, 0.0) * semantic_weight + 
         COALESCE(k.keyword_score, 0.0) * (1 - semantic_weight)) as hybrid_score
    FROM semantic_search s
    FULL OUTER JOIN keyword_search k 
        ON s.document_id = k.document_id 
        AND s.chunk_text = k.chunk_text
    ORDER BY hybrid_score DESC
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- List user documents
CREATE OR REPLACE FUNCTION list_user_documents(
    p_user_id TEXT,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    document_id UUID,
    document_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    upload_date TIMESTAMPTZ,
    chunk_count BIGINT,
    entity_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        md.id as document_id,
        md.original_filename as document_name,
        md.file_type,
        md.file_size,
        md.upload_date,
        COUNT(DISTINCT mc.id) as chunk_count,
        COUNT(DISTINCT me.id) as entity_count
    FROM medical_documents md
    LEFT JOIN medical_chunks mc ON md.id = mc.document_id
    LEFT JOIN medical_entities me ON md.id = me.document_id
    WHERE md.user_id = p_user_id
    GROUP BY md.id, md.original_filename, md.file_type, md.file_size, md.upload_date
    ORDER BY md.upload_date DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get document by ID
CREATE OR REPLACE FUNCTION get_document_by_id(
    p_document_id UUID,
    p_user_id TEXT
) RETURNS TABLE (
    document_id UUID,
    filename TEXT,
    file_type TEXT,
    local_file_path TEXT,
    upload_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        md.id,
        md.original_filename,
        md.file_type,
        md.local_file_path,
        md.upload_date
    FROM medical_documents md
    WHERE md.id = p_document_id AND md.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Delete document
CREATE OR REPLACE FUNCTION delete_document(
    p_document_id UUID,
    p_user_id TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM medical_documents 
    WHERE id = p_document_id AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Get database statistics
CREATE OR REPLACE FUNCTION get_database_stats(
    p_user_id TEXT
) RETURNS TABLE (
    total_documents BIGINT,
    total_chunks BIGINT,
    total_entities BIGINT,
    storage_used_mb FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT md.id) as total_documents,
        COUNT(DISTINCT mc.id) as total_chunks,
        COUNT(DISTINCT me.id) as total_entities,
        ROUND(SUM(md.file_size)::NUMERIC / 1024 / 1024, 2)::FLOAT as storage_used_mb
    FROM medical_documents md
    LEFT JOIN medical_chunks mc ON md.id = mc.document_id
    LEFT JOIN medical_entities me ON md.id = me.document_id
    WHERE md.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY (Optional - for multi-tenant)
-- =====================================================

-- Enable RLS
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Policies (basic - customize based on your auth)
CREATE POLICY "Users can view their own documents" 
ON medical_documents FOR SELECT 
USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert their own documents" 
ON medical_documents FOR INSERT 
WITH CHECK (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update their own documents" 
ON medical_documents FOR UPDATE 
USING (user_id = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete their own documents" 
ON medical_documents FOR DELETE 
USING (user_id = current_setting('app.current_user_id', true));

-- Similar policies for other tables
CREATE POLICY "Users can view chunks of their documents" 
ON medical_chunks FOR SELECT 
USING (document_id IN (
    SELECT id FROM medical_documents 
    WHERE user_id = current_setting('app.current_user_id', true)
));

CREATE POLICY "Users can view entities of their documents" 
ON medical_entities FOR SELECT 
USING (document_id IN (
    SELECT id FROM medical_documents 
    WHERE user_id = current_setting('app.current_user_id', true)
));

CREATE POLICY "Users can view their own chat history" 
ON chat_history FOR SELECT 
USING (user_id = current_setting('app.current_user_id', true));

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- You can add sample data here if needed

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these to verify setup:
-- SELECT * FROM medical_documents LIMIT 5;
-- SELECT COUNT(*) FROM medical_chunks;
-- SELECT COUNT(*) FROM medical_entities;
-- SELECT * FROM list_user_documents('default_user', 10, 0);
