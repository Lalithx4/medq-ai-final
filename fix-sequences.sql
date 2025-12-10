-- Fix sequences for all tables
-- Run this in your NEW Supabase project SQL Editor

-- Fix User table sequence (if it has auto-increment)
SELECT setval(
    pg_get_serial_sequence('public."User"', 'id'),
    COALESCE((SELECT MAX(id::bigint) FROM public."User"), 1),
    true
) WHERE pg_get_serial_sequence('public."User"', 'id') IS NOT NULL;

-- Fix BaseDocument table sequence (if it has auto-increment)
SELECT setval(
    pg_get_serial_sequence('public."BaseDocument"', 'id'),
    COALESCE((SELECT MAX(id::bigint) FROM public."BaseDocument"), 1),
    true
) WHERE pg_get_serial_sequence('public."BaseDocument"', 'id') IS NOT NULL;

-- Fix Presentation table sequence (if it has auto-increment)
SELECT setval(
    pg_get_serial_sequence('public."Presentation"', 'id'),
    COALESCE((SELECT MAX(id::bigint) FROM public."Presentation"), 1),
    true
) WHERE pg_get_serial_sequence('public."Presentation"', 'id') IS NOT NULL;

-- Fix Payment table sequence (if it has auto-increment)
SELECT setval(
    pg_get_serial_sequence('public."Payment"', 'id'),
    COALESCE((SELECT MAX(id::bigint) FROM public."Payment"), 1),
    true
) WHERE pg_get_serial_sequence('public."Payment"', 'id') IS NOT NULL;

-- Fix CreditTransaction table sequence (if it has auto-increment)
SELECT setval(
    pg_get_serial_sequence('public."CreditTransaction"', 'id'),
    COALESCE((SELECT MAX(id::bigint) FROM public."CreditTransaction"), 1),
    true
) WHERE pg_get_serial_sequence('public."CreditTransaction"', 'id') IS NOT NULL;

-- Verify all sequences are correct
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    pg_get_serial_sequence(schemaname || '.' || tablename, attname) as sequence_name,
    last_value
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_sequences s ON pg_get_serial_sequence(n.nspname || '.' || c.relname, a.attname) = n.nspname || '.' || s.sequencename
WHERE n.nspname = 'public'
  AND a.atthasdef
  AND pg_get_expr(a.attdefault, a.attrelid) LIKE 'nextval%'
ORDER BY tablename, attname;
