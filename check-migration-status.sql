-- Check if PDF Collections migration was applied successfully
-- Run this in Supabase SQL Editor

-- 1. Check if pdf_collections table exists
SELECT 
    'pdf_collections table' as check_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pdf_collections'
    ) as exists;

-- 2. Check if collection_id column exists in pdf_documents
SELECT 
    'pdf_documents.collection_id column' as check_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pdf_documents' 
        AND column_name = 'collection_id'
    ) as exists;

-- 3. Check if collection_id column exists in pdf_chat_sessions
SELECT 
    'pdf_chat_sessions.collection_id column' as check_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'pdf_chat_sessions' 
        AND column_name = 'collection_id'
    ) as exists;

-- 4. Check if document_id is nullable in pdf_chat_sessions
SELECT 
    'pdf_chat_sessions.document_id nullable' as check_name,
    is_nullable = 'YES' as is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'pdf_chat_sessions' 
AND column_name = 'document_id';

-- 5. Check RLS policies on pdf_collections
SELECT 
    'RLS policies count' as check_name,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'pdf_collections';

-- 6. List all policies on pdf_collections
SELECT 
    policyname,
    cmd as command,
    qual as using_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'pdf_collections'
ORDER BY policyname;

-- 7. Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('pdf_collections', 'pdf_documents', 'pdf_chat_sessions')
AND indexname LIKE '%collection%'
ORDER BY tablename, indexname;
