-- =====================================================
-- BioDocs AI - Complete Supabase Database Schema
-- =====================================================
-- This file contains all the SQL needed to set up your Supabase database
-- Run this in the Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Enable Required Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- STEP 2: Create ENUM Types
-- =====================================================
DO $$ BEGIN
    CREATE TYPE "DocumentType" AS ENUM (
        'NOTE',
        'DOCUMENT',
        'DRAWING',
        'DESIGN',
        'STICKY_NOTES',
        'MIND_MAP',
        'RAG',
        'RESEARCH_PAPER',
        'FLIPBOOK',
        'PRESENTATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM (
        'ADMIN',
        'USER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- STEP 3: Create Core Tables
-- =====================================================

-- User Table (Main user table)
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    "emailVerified" TIMESTAMP(3),
    image TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    headline VARCHAR(100),
    bio TEXT,
    interests TEXT[],
    location TEXT,
    website TEXT,
    role "UserRole" DEFAULT 'USER' NOT NULL,
    "hasAccess" BOOLEAN DEFAULT false NOT NULL,
    credits INTEGER DEFAULT 100 NOT NULL,
    "stripeCustomerId" TEXT UNIQUE,
    "subscriptionEnd" TIMESTAMP(3),
    "subscriptionPlan" TEXT DEFAULT 'free' NOT NULL,
    "totalInputTokens" INTEGER DEFAULT 0 NOT NULL,
    "totalOutputTokens" INTEGER DEFAULT 0 NOT NULL,
    "totalTokens" INTEGER DEFAULT 0 NOT NULL,
    "totalTokenCost" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    "subscriptionStart" TIMESTAMP(3),
    "lastCreditRefresh" TIMESTAMP(3)
);

-- Account Table (OAuth Accounts)
CREATE TABLE IF NOT EXISTS "Account" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    type TEXT NOT NULL,
    provider TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    refresh_token TEXT,
    access_token TEXT,
    expires_at INTEGER,
    token_type TEXT,
    scope TEXT,
    id_token TEXT,
    session_state TEXT,
    refresh_token_expires_in INTEGER,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- BaseDocument Table
CREATE TABLE IF NOT EXISTS "BaseDocument" (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type "DocumentType" NOT NULL,
    "userId" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isPublic" BOOLEAN DEFAULT false NOT NULL,
    "documentType" TEXT NOT NULL,
    CONSTRAINT "BaseDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ChatConversation Table
CREATE TABLE IF NOT EXISTS "ChatConversation" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    title TEXT,
    context TEXT NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ChatMessage Table
CREATE TABLE IF NOT EXISTS "ChatMessage" (
    id TEXT PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreditTransaction Table
CREATE TABLE IF NOT EXISTS "CreditTransaction" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    operation TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- CustomTheme Table
CREATE TABLE IF NOT EXISTS "CustomTheme" (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "userId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "isPublic" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "themeData" JSONB NOT NULL,
    CONSTRAINT "CustomTheme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- DeepResearchReport Table
CREATE TABLE IF NOT EXISTS "DeepResearchReport" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    topic TEXT NOT NULL,
    status TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    markdown TEXT NOT NULL,
    "pmidsUsed" JSONB,
    "wordCount" INTEGER,
    "referenceCount" INTEGER,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeepResearchReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Document Table
CREATE TABLE IF NOT EXISTS "Document" (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT NOT NULL,
    sources TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- FavoriteDocument Table
CREATE TABLE IF NOT EXISTS "FavoriteDocument" (
    id TEXT PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "FavoriteDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "BaseDocument"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FavoriteDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- GeneratedImage Table
CREATE TABLE IF NOT EXISTS "GeneratedImage" (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    prompt TEXT NOT NULL,
    CONSTRAINT "GeneratedImage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Payment Table
CREATE TABLE IF NOT EXISTS "Payment" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    plan TEXT NOT NULL,
    "creditsAdded" INTEGER NOT NULL,
    "stripePaymentId" TEXT UNIQUE,
    "razorpayPaymentId" TEXT UNIQUE,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Presentation Table
CREATE TABLE IF NOT EXISTS "Presentation" (
    id TEXT PRIMARY KEY,
    content JSONB NOT NULL,
    theme TEXT DEFAULT 'default' NOT NULL,
    "imageSource" TEXT DEFAULT 'ai' NOT NULL,
    prompt TEXT,
    "presentationStyle" TEXT,
    language TEXT DEFAULT 'en-US',
    outline TEXT[],
    "searchResults" JSONB,
    "templateId" TEXT,
    "customThemeId" TEXT,
    CONSTRAINT "Presentation_id_fkey" FOREIGN KEY (id) REFERENCES "BaseDocument"(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Presentation_customThemeId_fkey" FOREIGN KEY ("customThemeId") REFERENCES "CustomTheme"(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- TokenUsage Table
CREATE TABLE IF NOT EXISTS "TokenUsage" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    operation TEXT NOT NULL,
    "operationId" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "inputCost" DOUBLE PRECISION NOT NULL,
    "outputCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    metadata JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "TokenUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- =====================================================
-- STEP 4: PDF Chat RAG Tables
-- =====================================================

-- PDF Collections Table (for grouping PDFs)
CREATE TABLE IF NOT EXISTS pdf_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    file_search_store_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "pdf_collections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- PDF Documents Table
CREATE TABLE IF NOT EXISTS pdf_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    collection_id UUID,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER NOT NULL,
    page_count INTEGER,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "pdf_documents_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE,
    CONSTRAINT "pdf_documents_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES pdf_collections(id) ON DELETE SET NULL
);

-- Medical Chunks Table (with vector embeddings for RAG)
CREATE TABLE IF NOT EXISTS "MedicalChunk" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "chunkIdx" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    embedding vector(768),
    metadata JSONB,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "MedicalChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES pdf_documents(id) ON DELETE CASCADE,
    CONSTRAINT "MedicalChunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- Medical Entity Table (NER extracted entities)
CREATE TABLE IF NOT EXISTS "MedicalEntity" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityText" TEXT NOT NULL,
    "startChar" INTEGER,
    "endChar" INTEGER,
    "confidenceScore" DOUBLE PRECISION DEFAULT 0.8,
    "createdAt" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "MedicalEntity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES pdf_documents(id) ON DELETE CASCADE,
    CONSTRAINT "MedicalEntity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

-- PDF Chat Session Table
CREATE TABLE IF NOT EXISTS pdf_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID,
    document_id UUID,
    user_id TEXT NOT NULL,
    title TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "pdf_chat_sessions_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES pdf_collections(id) ON DELETE CASCADE,
    CONSTRAINT "pdf_chat_sessions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES pdf_documents(id) ON DELETE CASCADE,
    CONSTRAINT "pdf_chat_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE
);

-- PDF Chat Message Table
CREATE TABLE IF NOT EXISTS pdf_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources JSONB,
    confidence_score DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "pdf_chat_messages_session_id_fkey" FOREIGN KEY (session_id) REFERENCES pdf_chat_sessions(id) ON DELETE CASCADE
);

-- =====================================================
-- STEP 5: Create Indexes
-- =====================================================

-- User Indexes
CREATE INDEX IF NOT EXISTS "User_lastCreditRefresh_idx" ON "User"("lastCreditRefresh");
CREATE INDEX IF NOT EXISTS "User_subscriptionEnd_idx" ON "User"("subscriptionEnd");
CREATE INDEX IF NOT EXISTS "User_subscriptionPlan_idx" ON "User"("subscriptionPlan");

-- Account Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Account_provider_providerAccountId_key" ON "Account"(provider, "providerAccountId");

-- ChatConversation Indexes
CREATE INDEX IF NOT EXISTS "ChatConversation_context_idx" ON "ChatConversation"(context);
CREATE INDEX IF NOT EXISTS "ChatConversation_userId_idx" ON "ChatConversation"("userId");

-- ChatMessage Indexes
CREATE INDEX IF NOT EXISTS "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId");

-- CreditTransaction Indexes
CREATE INDEX IF NOT EXISTS "CreditTransaction_createdAt_idx" ON "CreditTransaction"("createdAt");
CREATE INDEX IF NOT EXISTS "CreditTransaction_type_idx" ON "CreditTransaction"(type);
CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_idx" ON "CreditTransaction"("userId");

-- CustomTheme Indexes
CREATE INDEX IF NOT EXISTS "CustomTheme_userId_idx" ON "CustomTheme"("userId");

-- DeepResearchReport Indexes
CREATE INDEX IF NOT EXISTS "DeepResearchReport_status_idx" ON "DeepResearchReport"(status);
CREATE INDEX IF NOT EXISTS "DeepResearchReport_userId_idx" ON "DeepResearchReport"("userId");

-- Document Indexes
CREATE INDEX IF NOT EXISTS "Document_type_idx" ON "Document"(type);
CREATE INDEX IF NOT EXISTS "Document_userId_idx" ON "Document"("userId");

-- Payment Indexes
CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");
CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"(status);
CREATE INDEX IF NOT EXISTS "Payment_userId_idx" ON "Payment"("userId");

-- TokenUsage Indexes
CREATE INDEX IF NOT EXISTS "TokenUsage_createdAt_idx" ON "TokenUsage"("createdAt");
CREATE INDEX IF NOT EXISTS "TokenUsage_modelProvider_idx" ON "TokenUsage"("modelProvider");
CREATE INDEX IF NOT EXISTS "TokenUsage_operation_idx" ON "TokenUsage"(operation);
CREATE INDEX IF NOT EXISTS "TokenUsage_userId_createdAt_idx" ON "TokenUsage"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "TokenUsage_userId_idx" ON "TokenUsage"("userId");

-- PDF Collections Indexes
CREATE INDEX IF NOT EXISTS "pdf_collections_user_id_idx" ON pdf_collections(user_id);
CREATE INDEX IF NOT EXISTS "pdf_collections_created_at_idx" ON pdf_collections(created_at);

-- PDF Documents Indexes
CREATE INDEX IF NOT EXISTS "pdf_documents_user_id_idx" ON pdf_documents(user_id);
CREATE INDEX IF NOT EXISTS "pdf_documents_collection_id_idx" ON pdf_documents(collection_id);
CREATE INDEX IF NOT EXISTS "pdf_documents_status_idx" ON pdf_documents(status);
CREATE INDEX IF NOT EXISTS "pdf_documents_created_at_idx" ON pdf_documents(created_at);

-- MedicalChunk Indexes
CREATE INDEX IF NOT EXISTS "MedicalChunk_documentId_idx" ON "MedicalChunk"("documentId");
CREATE INDEX IF NOT EXISTS "MedicalChunk_userId_idx" ON "MedicalChunk"("userId");
CREATE INDEX IF NOT EXISTS "MedicalChunk_pageNumber_idx" ON "MedicalChunk"("pageNumber");

-- Vector similarity search index (HNSW for cosine similarity - works with any data size)
CREATE INDEX IF NOT EXISTS "MedicalChunk_embedding_idx" 
ON "MedicalChunk" USING hnsw (embedding vector_cosine_ops);

-- Text search index for trigram similarity
CREATE INDEX IF NOT EXISTS "MedicalChunk_text_trgm_idx" 
ON "MedicalChunk" USING gin ("chunkText" gin_trgm_ops);

-- MedicalEntity Indexes
CREATE INDEX IF NOT EXISTS "MedicalEntity_documentId_idx" ON "MedicalEntity"("documentId");
CREATE INDEX IF NOT EXISTS "MedicalEntity_userId_idx" ON "MedicalEntity"("userId");
CREATE INDEX IF NOT EXISTS "MedicalEntity_entityType_idx" ON "MedicalEntity"("entityType");
CREATE INDEX IF NOT EXISTS "MedicalEntity_entityName_idx" ON "MedicalEntity"("entityName");

-- PDF Chat Session Indexes
CREATE INDEX IF NOT EXISTS "pdf_chat_sessions_collection_id_idx" ON pdf_chat_sessions(collection_id);
CREATE INDEX IF NOT EXISTS "pdf_chat_sessions_document_id_idx" ON pdf_chat_sessions(document_id);
CREATE INDEX IF NOT EXISTS "pdf_chat_sessions_user_id_idx" ON pdf_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS "pdf_chat_sessions_created_at_idx" ON pdf_chat_sessions(created_at);

-- PDF Chat Message Indexes
CREATE INDEX IF NOT EXISTS "pdf_chat_messages_session_id_idx" ON pdf_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS "pdf_chat_messages_created_at_idx" ON pdf_chat_messages(created_at);

-- =====================================================
-- STEP 6: Create Functions
-- =====================================================

-- Function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for hybrid search (semantic + keyword)
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

-- =====================================================
-- STEP 7: Create Triggers
-- =====================================================

-- Trigger for pdf_documents updated_at
DROP TRIGGER IF EXISTS update_pdf_documents_updated_at ON pdf_documents;
CREATE TRIGGER update_pdf_documents_updated_at
    BEFORE UPDATE ON pdf_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for pdf_chat_sessions updated_at
DROP TRIGGER IF EXISTS update_pdf_chat_sessions_updated_at ON pdf_chat_sessions;
CREATE TRIGGER update_pdf_chat_sessions_updated_at
    BEFORE UPDATE ON pdf_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for pdf_collections updated_at
DROP TRIGGER IF EXISTS update_pdf_collections_updated_at ON pdf_collections;
CREATE TRIGGER update_pdf_collections_updated_at
    BEFORE UPDATE ON pdf_collections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 8: Enable Row Level Security (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BaseDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatConversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChatMessage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreditTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CustomTheme" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DeepResearchReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FavoriteDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GeneratedImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Presentation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TokenUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalChunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MedicalEntity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_chat_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 9: Create RLS Policies
-- =====================================================

-- User table policies (service role access)
DROP POLICY IF EXISTS "Service role full access" ON "User";
CREATE POLICY "Service role full access" ON "User"
    FOR ALL USING (true);

-- Account policies
DROP POLICY IF EXISTS "Users can view own accounts" ON "Account";
CREATE POLICY "Users can view own accounts" ON "Account"
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Service role can manage accounts" ON "Account";
CREATE POLICY "Service role can manage accounts" ON "Account"
    FOR ALL USING (true);

-- BaseDocument policies
DROP POLICY IF EXISTS "Users can view own documents" ON "BaseDocument";
CREATE POLICY "Users can view own documents" ON "BaseDocument"
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true) OR "isPublic" = true);

DROP POLICY IF EXISTS "Users can manage own documents" ON "BaseDocument";
CREATE POLICY "Users can manage own documents" ON "BaseDocument"
    FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- ChatConversation policies
DROP POLICY IF EXISTS "Users can manage own conversations" ON "ChatConversation";
CREATE POLICY "Users can manage own conversations" ON "ChatConversation"
    FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- ChatMessage policies
DROP POLICY IF EXISTS "Users can manage own messages" ON "ChatMessage";
CREATE POLICY "Users can manage own messages" ON "ChatMessage"
    FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- CreditTransaction policies
DROP POLICY IF EXISTS "Users can view own transactions" ON "CreditTransaction";
CREATE POLICY "Users can view own transactions" ON "CreditTransaction"
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Service role can manage transactions" ON "CreditTransaction";
CREATE POLICY "Service role can manage transactions" ON "CreditTransaction"
    FOR ALL USING (true);

-- CustomTheme policies
DROP POLICY IF EXISTS "Users can view own or public themes" ON "CustomTheme";
CREATE POLICY "Users can view own or public themes" ON "CustomTheme"
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true) OR "isPublic" = true);

DROP POLICY IF EXISTS "Users can manage own themes" ON "CustomTheme";
CREATE POLICY "Users can manage own themes" ON "CustomTheme"
    FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- DeepResearchReport policies
DROP POLICY IF EXISTS "Users can manage own reports" ON "DeepResearchReport";
CREATE POLICY "Users can manage own reports" ON "DeepResearchReport"
    FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- Document policies
DROP POLICY IF EXISTS "Users can manage own documents" ON "Document";
CREATE POLICY "Users can manage own documents" ON "Document"
    FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- FavoriteDocument policies
DROP POLICY IF EXISTS "Users can manage own favorites" ON "FavoriteDocument";
CREATE POLICY "Users can manage own favorites" ON "FavoriteDocument"
    FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- GeneratedImage policies
DROP POLICY IF EXISTS "Users can manage own images" ON "GeneratedImage";
CREATE POLICY "Users can manage own images" ON "GeneratedImage"
    FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

-- Payment policies
DROP POLICY IF EXISTS "Users can view own payments" ON "Payment";
CREATE POLICY "Users can view own payments" ON "Payment"
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Service role can manage payments" ON "Payment";
CREATE POLICY "Service role can manage payments" ON "Payment"
    FOR ALL USING (true);

-- Presentation policies (inherits from BaseDocument)
DROP POLICY IF EXISTS "Service role can manage presentations" ON "Presentation";
CREATE POLICY "Service role can manage presentations" ON "Presentation"
    FOR ALL USING (true);

-- TokenUsage policies
DROP POLICY IF EXISTS "Users can view own token usage" ON "TokenUsage";
CREATE POLICY "Users can view own token usage" ON "TokenUsage"
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Service role can manage token usage" ON "TokenUsage";
CREATE POLICY "Service role can manage token usage" ON "TokenUsage"
    FOR ALL USING (true);

-- PDF Collections policies
DROP POLICY IF EXISTS "Users can view own collections" ON pdf_collections;
CREATE POLICY "Users can view own collections" ON pdf_collections
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can manage own collections" ON pdf_collections;
CREATE POLICY "Users can manage own collections" ON pdf_collections
    FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- PDF Documents policies
DROP POLICY IF EXISTS "Users can view own pdf documents" ON pdf_documents;
CREATE POLICY "Users can view own pdf documents" ON pdf_documents
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can manage own pdf documents" ON pdf_documents;
CREATE POLICY "Users can manage own pdf documents" ON pdf_documents
    FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- MedicalChunk policies
DROP POLICY IF EXISTS "Users can view own chunks" ON "MedicalChunk";
CREATE POLICY "Users can view own chunks" ON "MedicalChunk"
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Service role can insert chunks" ON "MedicalChunk";
CREATE POLICY "Service role can insert chunks" ON "MedicalChunk"
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own chunks" ON "MedicalChunk";
CREATE POLICY "Users can delete own chunks" ON "MedicalChunk"
    FOR DELETE USING ("userId" = current_setting('app.current_user_id', true));

-- MedicalEntity policies
DROP POLICY IF EXISTS "Users can view own entities" ON "MedicalEntity";
CREATE POLICY "Users can view own entities" ON "MedicalEntity"
    FOR SELECT USING ("userId" = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Service role can insert entities" ON "MedicalEntity";
CREATE POLICY "Service role can insert entities" ON "MedicalEntity"
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can delete own entities" ON "MedicalEntity";
CREATE POLICY "Users can delete own entities" ON "MedicalEntity"
    FOR DELETE USING ("userId" = current_setting('app.current_user_id', true));

-- PDF Chat Session policies
DROP POLICY IF EXISTS "Users can view own sessions" ON pdf_chat_sessions;
CREATE POLICY "Users can view own sessions" ON pdf_chat_sessions
    FOR SELECT USING (user_id = current_setting('app.current_user_id', true));

DROP POLICY IF EXISTS "Users can manage own sessions" ON pdf_chat_sessions;
CREATE POLICY "Users can manage own sessions" ON pdf_chat_sessions
    FOR ALL USING (user_id = current_setting('app.current_user_id', true));

-- PDF Chat Message policies
DROP POLICY IF EXISTS "Users can view messages in own sessions" ON pdf_chat_messages;
CREATE POLICY "Users can view messages in own sessions" ON pdf_chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM pdf_chat_sessions 
            WHERE pdf_chat_sessions.id = pdf_chat_messages.session_id 
            AND pdf_chat_sessions.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Users can insert messages in own sessions" ON pdf_chat_messages;
CREATE POLICY "Users can insert messages in own sessions" ON pdf_chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM pdf_chat_sessions 
            WHERE pdf_chat_sessions.id = pdf_chat_messages.session_id 
            AND pdf_chat_sessions.user_id = current_setting('app.current_user_id', true)
        )
    );

DROP POLICY IF EXISTS "Service role can insert messages" ON pdf_chat_messages;
CREATE POLICY "Service role can insert messages" ON pdf_chat_messages
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- STEP 10: Add Comments for Documentation
-- =====================================================

COMMENT ON TABLE "User" IS 'Main user table with profile, subscription, and credit info';
COMMENT ON TABLE "Account" IS 'OAuth account connections (Google, GitHub, etc.)';
COMMENT ON TABLE "BaseDocument" IS 'Base document type for all document types';
COMMENT ON TABLE "ChatConversation" IS 'AI chat conversations';
COMMENT ON TABLE "ChatMessage" IS 'Messages within chat conversations';
COMMENT ON TABLE "CreditTransaction" IS 'Credit usage and purchase history';
COMMENT ON TABLE "CustomTheme" IS 'Custom presentation themes';
COMMENT ON TABLE "DeepResearchReport" IS 'Generated deep research reports';
COMMENT ON TABLE "Document" IS 'User documents and notes';
COMMENT ON TABLE "FavoriteDocument" IS 'User favorite documents';
COMMENT ON TABLE "GeneratedImage" IS 'AI generated images';
COMMENT ON TABLE "Payment" IS 'Payment and subscription records';
COMMENT ON TABLE "Presentation" IS 'Presentation slides and metadata';
COMMENT ON TABLE "TokenUsage" IS 'AI token usage tracking';
COMMENT ON TABLE pdf_collections IS 'PDF document collections for multi-doc chat';
COMMENT ON TABLE pdf_documents IS 'PDF document metadata and status';
COMMENT ON TABLE "MedicalChunk" IS 'Document chunks with vector embeddings for RAG';
COMMENT ON TABLE "MedicalEntity" IS 'Extracted medical entities (NER)';
COMMENT ON TABLE pdf_chat_sessions IS 'PDF chat sessions';
COMMENT ON TABLE pdf_chat_messages IS 'PDF chat messages with citations';

COMMENT ON COLUMN "MedicalChunk".embedding IS 'PubMedBERT 768-dimensional vector embedding';
COMMENT ON COLUMN "MedicalChunk"."userId" IS 'User isolation for data security';

-- =====================================================
-- SCHEMA SETUP COMPLETE!
-- =====================================================
-- 
-- Tables Created:
-- 1. User - Main user table
-- 2. Account - OAuth accounts
-- 3. BaseDocument - Base document type
-- 4. ChatConversation - AI chat conversations
-- 5. ChatMessage - Chat messages
-- 6. CreditTransaction - Credit history
-- 7. CustomTheme - Presentation themes
-- 8. DeepResearchReport - Research reports
-- 9. Document - User documents
-- 10. FavoriteDocument - Favorites
-- 11. GeneratedImage - AI images
-- 12. Payment - Payments
-- 13. Presentation - Presentations
-- 14. TokenUsage - Token tracking
-- 15. pdf_collections - PDF collections
-- 16. pdf_documents - PDF documents
-- 17. MedicalChunk - RAG chunks with embeddings
-- 18. MedicalEntity - NER entities
-- 19. pdf_chat_sessions - PDF chat sessions
-- 20. pdf_chat_messages - PDF chat messages
--
-- Features:
-- - Vector search with pgvector (768 dimensions)
-- - Trigram text search with pg_trgm
-- - Hybrid search function combining semantic and keyword search
-- - Row Level Security (RLS) on all tables
-- - Proper indexes for performance
-- - Timestamp triggers for updated_at
-- =====================================================
