-- =====================================================
-- PDF Chat RAG System - Database Schema
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- PDF Documents Table
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_url TEXT,
    file_size BIGINT NOT NULL,
    page_count INTEGER,
    status TEXT DEFAULT 'uploading' CHECK (status IN ('uploading', 'processing', 'ready', 'error')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- Medical Chunks Table (with embeddings)
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
    chunk_idx INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    page_number INTEGER,
    chunk_type TEXT DEFAULT 'text',
    token_count INTEGER,
    embedding vector(768), -- PubMedBERT 768 dimensions
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Medical Entities Table
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
    entity_name TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- DISEASE, DRUG, SYMPTOM, PROCEDURE, etc.
    entity_text TEXT,
    start_char INTEGER,
    end_char INTEGER,
    confidence_score FLOAT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Chat Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES pdf_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- =====================================================
-- Chat Messages Table
-- =====================================================
CREATE TABLE IF NOT EXISTS pdf_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES pdf_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    sources JSONB, -- Citation data: [{"page_number": 5, "similarity": 0.87, "text_excerpt": "..."}]
    confidence_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Vector similarity search index (IVFFlat for cosine similarity)
CREATE INDEX IF NOT EXISTS medical_chunks_embedding_idx 
ON medical_chunks USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Text search indexes
CREATE INDEX IF NOT EXISTS medical_chunks_text_idx 
ON medical_chunks USING gin(to_tsvector('english', chunk_text));

CREATE INDEX IF NOT EXISTS medical_chunks_text_trgm_idx 
ON medical_chunks USING gin(chunk_text gin_trgm_ops);

-- Regular indexes
CREATE INDEX IF NOT EXISTS pdf_documents_user_id_idx ON pdf_documents(user_id);
CREATE INDEX IF NOT EXISTS pdf_documents_status_idx ON pdf_documents(status);
CREATE INDEX IF NOT EXISTS medical_chunks_document_id_idx ON medical_chunks(document_id);
CREATE INDEX IF NOT EXISTS medical_chunks_page_number_idx ON medical_chunks(page_number);
CREATE INDEX IF NOT EXISTS medical_entities_document_id_idx ON medical_entities(document_id);
CREATE INDEX IF NOT EXISTS medical_entities_type_idx ON medical_entities(entity_type);
CREATE INDEX IF NOT EXISTS pdf_chat_sessions_document_id_idx ON pdf_chat_sessions(document_id);
CREATE INDEX IF NOT EXISTS pdf_chat_sessions_user_id_idx ON pdf_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS pdf_chat_messages_session_id_idx ON pdf_chat_messages(session_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_chat_messages ENABLE ROW LEVEL SECURITY;

-- PDF Documents Policies
CREATE POLICY "Users can view their own documents"
ON pdf_documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON pdf_documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON pdf_documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON pdf_documents FOR DELETE
USING (auth.uid() = user_id);

-- Medical Chunks Policies (access through document ownership)
CREATE POLICY "Users can view chunks of their documents"
ON medical_chunks FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM pdf_documents
        WHERE pdf_documents.id = medical_chunks.document_id
        AND pdf_documents.user_id = auth.uid()
    )
);

CREATE POLICY "Service role can insert chunks"
ON medical_chunks FOR INSERT
WITH CHECK (true);

-- Medical Entities Policies
CREATE POLICY "Users can view entities of their documents"
ON medical_entities FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM pdf_documents
        WHERE pdf_documents.id = medical_entities.document_id
        AND pdf_documents.user_id = auth.uid()
    )
);

CREATE POLICY "Service role can insert entities"
ON medical_entities FOR INSERT
WITH CHECK (true);

-- Chat Sessions Policies
CREATE POLICY "Users can view their own chat sessions"
ON pdf_chat_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions"
ON pdf_chat_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions"
ON pdf_chat_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat sessions"
ON pdf_chat_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Chat Messages Policies
CREATE POLICY "Users can view messages in their sessions"
ON pdf_chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM pdf_chat_sessions
        WHERE pdf_chat_sessions.id = pdf_chat_messages.session_id
        AND pdf_chat_sessions.user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages in their sessions"
ON pdf_chat_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM pdf_chat_sessions
        WHERE pdf_chat_sessions.id = pdf_chat_messages.session_id
        AND pdf_chat_sessions.user_id = auth.uid()
    )
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function for hybrid search (semantic + keyword)
CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(768),
    query_text TEXT,
    doc_id UUID,
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
        ORDER BY mc.embedding <=> query_embedding
        LIMIT match_count * 2
    ),
    keyword_search AS (
        SELECT 
            mc.id,
            similarity(mc.chunk_text, query_text) as keyword_score
        FROM medical_chunks mc
        WHERE mc.document_id = doc_id
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
$$ LANGUAGE plpgsql;

-- Function to update document status
CREATE OR REPLACE FUNCTION update_document_status(
    doc_id UUID,
    new_status TEXT,
    error_msg TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    UPDATE pdf_documents
    SET 
        status = new_status,
        error_message = error_msg,
        updated_at = NOW()
    WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pdf_documents_updated_at
    BEFORE UPDATE ON pdf_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pdf_chat_sessions_updated_at
    BEFORE UPDATE ON pdf_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
