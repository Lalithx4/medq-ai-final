-- Simple Migration Verification
-- Run this in your NEW Supabase project SQL Editor

-- 1. List all tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check auth users
SELECT COUNT(*) as auth_users_count FROM auth.users;

-- 3. Check auth identities
SELECT COUNT(*) as auth_identities_count FROM auth.identities;

-- 4. Show sample users (first 5)
SELECT id, email, name, "createdAt" 
FROM public."User" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- 5. Show sample documents (first 5)
SELECT id, title, type, "userId", "createdAt" 
FROM public."BaseDocument" 
ORDER BY "createdAt" DESC 
LIMIT 5;

-- 6. Show sample presentations (first 5)
SELECT id, "baseDocumentId", theme, "createdAt"
FROM public."Presentation"
ORDER BY "createdAt" DESC
LIMIT 5;

-- 7. Count all important tables
SELECT 
    (SELECT COUNT(*) FROM public."User") as users,
    (SELECT COUNT(*) FROM public."BaseDocument") as documents,
    (SELECT COUNT(*) FROM public."Presentation") as presentations,
    (SELECT COUNT(*) FROM public."Payment") as payments,
    (SELECT COUNT(*) FROM public."CreditTransaction") as credit_transactions;
