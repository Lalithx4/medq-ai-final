#!/bin/bash

# Quick Migration Verification Script
# This connects to your new Supabase database and shows the data

set -e

NEW_DB_URL="postgresql://postgres.vjkxwklusgjxcpddcwjl:mimhid-4qAxky-dojzeb@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

echo "🔍 Checking Migration Status..."
echo "================================"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ psql not found. Please install PostgreSQL client tools."
    exit 1
fi

echo "📊 Tables in public schema:"
psql "$NEW_DB_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

echo ""
echo "👥 Auth Users Count:"
psql "$NEW_DB_URL" -c "SELECT COUNT(*) as auth_users FROM auth.users;"

echo ""
echo "📈 Row Counts:"
psql "$NEW_DB_URL" -c "
SELECT 
    'User' as table_name, 
    COUNT(*) as row_count 
FROM public.\"User\"
UNION ALL
SELECT 'BaseDocument', COUNT(*) FROM public.\"BaseDocument\"
UNION ALL
SELECT 'Presentation', COUNT(*) FROM public.\"Presentation\"
UNION ALL
SELECT 'Payment', COUNT(*) FROM public.\"Payment\"
UNION ALL
SELECT 'CreditTransaction', COUNT(*) FROM public.\"CreditTransaction\"
ORDER BY table_name;
"

echo ""
echo "👤 Sample Users (first 5):"
psql "$NEW_DB_URL" -c "SELECT id, email, name, \"createdAt\" FROM public.\"User\" ORDER BY \"createdAt\" DESC LIMIT 5;"

echo ""
echo "📄 Sample Documents (first 5):"
psql "$NEW_DB_URL" -c "SELECT id, title, type, \"userId\", \"createdAt\" FROM public.\"BaseDocument\" ORDER BY \"createdAt\" DESC LIMIT 5;"

echo ""
echo "✅ Verification Complete!"
