-- Verify Migration Success
-- Run this in your NEW Supabase project SQL Editor

-- Check all tables and row counts
SELECT 
    schemaname,
    tablename,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = schemaname AND table_name = tablename) as table_exists,
    (xpath('/row/c/text()', query_to_xml(format('SELECT COUNT(*) as c FROM %I.%I', schemaname, tablename), false, true, '')))[1]::text::int as row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check what tables actually exist
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Count rows in each existing table
DO $$
DECLARE
    r RECORD;
    row_count INTEGER;
BEGIN
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', r.table_name) INTO row_count;
        RAISE NOTICE '% : % rows', r.table_name, row_count;
    END LOOP;
END $$;

-- Check auth users
SELECT 'auth.users' as table_name, COUNT(*) as count FROM auth.users;

-- Check auth identities  
SELECT 'auth.identities' as table_name, COUNT(*) as count FROM auth.identities;

-- Sample data check - show first few users (if User table exists)
SELECT id, email, name, "createdAt" FROM public."User" LIMIT 5;

-- Sample data check - show first few documents (if BaseDocument exists)
SELECT id, title, type, "userId", "createdAt" FROM public."BaseDocument" LIMIT 5;
