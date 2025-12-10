-- Medical RAG System - Clean Supabase Schema
-- Handles existing objects

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop existing tables if they exist (to avoid conflicts)
DROP TABLE IF EXISTS medical_chunks CASCADE;
DROP TABLE IF EXISTS medical_entities CASCADE;
DROP TABLE IF EXISTS medical_documents CASCADE;

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
CREATE INDEX IF NOT EXISTS medical_chunks_text_idx ON medical_chunks USING gin(chunk_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS medical_entities_name_idx ON medical_entities USING gin(entity_name gin_trgm_ops);

-- Performance indexes
CREATE INDEX IF NOT EXISTS medical_chunks_document_id_idx ON medical_chunks(document_id);
CREATE INDEX IF NOT EXISTS medical_entities_document_id_idx ON medical_entities(document_id);
CREATE INDEX IF NOT EXISTS medical_documents_user_id_idx ON medical_documents(user_id);
CREATE INDEX IF NOT EXISTS medical_documents_status_idx ON medical_documents(processing_status);
CREATE INDEX IF NOT EXISTS medical_documents_hash_idx ON medical_documents(file_hash);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to add document chunks in batches
CREATE OR REPLACE FUNCTION add_document_chunks(
    p_document_id UUID,
    p_chunks JSONB
) RETURNS INTEGER AS $$
DECLARE
    chunk_count INTEGER := 0;
    chunk_record JSONB;
BEGIN
    -- Loop through chunks and insert
    FOR chunk_record IN SELECT * FROM jsonb_array_elements(p_chunks)
    LOOP
        INSERT INTO medical_chunks (
            document_id,
            chunk_idx,
            chunk_text,
            page_number,
            embedding,
            metadata
        ) VALUES (
            p_document_id,
            (chunk_record->>'chunk_idx')::INTEGER,
            chunk_record->>'chunk_text',
            (chunk_record->>'page_number')::INTEGER,
            (chunk_record->>'embedding')::vector(768),
            chunk_record->'metadata'
        );
        chunk_count := chunk_count + 1;
    END LOOP;
    
    RETURN chunk_count;
END;
$$ LANGUAGE plpgsql;

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
        user_id,
        filename,
        original_filename,
        file_type,
        file_size,
        file_hash,
        local_file_path,
        processing_status
    ) VALUES (
        p_user_id,
        p_filename,
        p_original_filename,
        p_file_type,
        p_file_size,
        p_file_hash,
        p_local_file_path,
        'processing'
    ) RETURNING id INTO v_document_id;
    
    RETURN v_document_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update update document status
CREATE OR REPLACE FUNCTION update_document_status(
    p_document_id UUID,
    p_status TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE medical_documents 
    SET processing_status = p_status,
        updated_at = NOW()
    WHERE id = p_document_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get document chunks for a document
CREATE OR REPLACE FUNCTION get_document_chunks(
    p_document_id UUID,
    p_limit INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    chunk_idx INTEGER,
    chunk_text TEXT,
    page_number INTEGER,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mc.id,
        mc.chunk_idx,
        mc.chunk_text,
        mc.page_number,
        mc.metadata
    FROM medical_chunks mc
    WHERE mc.document_id = p_document_id
    ORDER BY mc.chunk_idx
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function for hybrid search (semantic + keyword)
CREATE OR REPLACE FUNCTION search_medical_documents(
    p_query TEXT,
    p_k INTEGER DEFAULT 5,
    p_user_id TEXT DEFAULT 'default_user'
) RETURNS TABLE (
    document_id UUID,
    filename TEXT,
    chunk_text TEXT,
    page_number INTEGER,
    similarity_score FLOAT,
    keyword_score FLOAT,
    combined_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- Semantic search using embeddings
    semantic_search AS (
        SELECT 
            md.id as document_id,
            md.filename,
            mc.chunk_text,
            mc.page_number,
            1 - (mc.embedding <=> (SELECT embedding FROM (
                SELECT embedding 
                FROM medical_chunks 
                WHERE chunk_text % p_query 
                LIMIT 1
            ) temp)) as similarity_score,
            0 as keyword_score
        FROM medical_chunks mc
        JOIN medical_documents md ON mc.document_id = md.id
        WHERE md.user_id = p_user_id
        ORDER BY mc.embedding <=> (SELECT embedding FROM (
            SELECT embedding 
            FROM medical_chunks 
            WHERE chunk_text % p_query 
            LIMIT 1
        ) temp)
        LIMIT p_k * 2
    ),
    -- Keyword search
    keyword_search AS (
        SELECT 
            md.id as document_id,
            md.filename,
            mc.chunk_text,
            mc.page_number,
            0 as similarity_score,
            ts_rank_cd(
                to_tsvector('english', mc.chunk_text), 
                plainto_tsquery('english', p_query)
            ) as keyword_score
        FROM medical_chunks mc
        JOIN medical_documents md ON mc.document_id = md.id
        WHERE md.user_id = p_user_id
        AND to_tsvector('english', mc.chunk_text) @@ plainto_tsquery('english', p_query)
        ORDER BY keyword_score DESC
        LIMIT p_k * 2
    )
    -- Combine results
    SELECT 
        COALESCE(s.document_id, k.document_id) as document_id,
        COALESCE(s.filename, k.filename) as filename,
        COALESCE(s.chunk_text, k.chunk_text) as chunk_text,
        COALESCE(s.page_number, k.page_number) as page_number,
        COALESCE(s.similarity_score, 0) as similarity_score,
        COALESCE(k.keyword_score, 0) as keyword_score,
        (COALESCE(s.similarity_score, 0) * 0.7 + COALESCE(k.keyword_score, 0) * 0.3) as combined_score
    FROM semantic_search s
    FULL OUTER JOIN keyword_search k ON s.document_id = k.document_id AND s.page_number = k.page_number
    ORDER BY combined_score DESC
    LIMIT p_k;
END;
$$ LANGUAGE plpgsql;

-- Function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats(
    p_document_id UUID
) RETURNS TABLE (
    total_chunks INTEGER,
    total_entities INTEGER,
    processing_status TEXT,
    file_size BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM medical_chunks WHERE document_id = p_document_id) as total_chunks,
        (SELECT COUNT(*) FROM medical_entities WHERE document_id = p_document_id) as total_entities,
        md.processing_status,
        md.file_size
    FROM medical_documents md
    WHERE md.id = p_document_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to medical_documents
DROP TRIGGER IF EXISTS update_medical_documents_updated_at ON medical_documents;
CREATE TRIGGER update_medical_documents_updated_at
    BEFORE UPDATE ON medical_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Uncomment to insert sample data
-- INSERT INTO medical_documents (user_id, filename, original_filename, file_type, file_size, processing_status)
-- VALUES ('default_user', 'sample.pdf', 'sample.pdf', 'pdf', 1024, 'completed')
-- ON CONFLICT DO NOTHING;
