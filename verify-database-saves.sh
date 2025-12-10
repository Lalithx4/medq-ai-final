#!/bin/bash

# Database Save Verification Script
# This script checks if all features are saving to the database correctly

echo "🔍 Database Save Verification"
echo "=============================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it in your .env file"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Function to run SQL query
run_query() {
    psql "$DATABASE_URL" -t -c "$1" 2>/dev/null
}

# Check database connection
echo "📡 Testing database connection..."
DB_VERSION=$(run_query "SELECT version();")
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful"
else
    echo "❌ Failed to connect to database"
    exit 1
fi
echo ""

# Check Presentations
echo "📊 Checking Presentations..."
PRESENTATION_COUNT=$(run_query "SELECT COUNT(*) FROM \"BaseDocument\" WHERE type = 'PRESENTATION';")
echo "   Total presentations: $PRESENTATION_COUNT"

if [ "$PRESENTATION_COUNT" -gt 0 ]; then
    echo "   Recent presentations:"
    run_query "SELECT '   - ' || title || ' (Updated: ' || \"updatedAt\" || ')' FROM \"BaseDocument\" WHERE type = 'PRESENTATION' ORDER BY \"updatedAt\" DESC LIMIT 3;"
fi
echo ""

# Check Documents
echo "📄 Checking Documents..."
DOCUMENT_COUNT=$(run_query "SELECT COUNT(*) FROM \"Document\";")
echo "   Total documents: $DOCUMENT_COUNT"

if [ "$DOCUMENT_COUNT" -gt 0 ]; then
    echo "   Recent documents:"
    run_query "SELECT '   - ' || title || ' (' || type || ', Updated: ' || \"updatedAt\" || ')' FROM \"Document\" ORDER BY \"updatedAt\" DESC LIMIT 3;"
fi
echo ""

# Check Deep Research Reports
echo "🔬 Checking Deep Research Reports..."
RESEARCH_COUNT=$(run_query "SELECT COUNT(*) FROM \"DeepResearchReport\";")
echo "   Total reports: $RESEARCH_COUNT"

if [ "$RESEARCH_COUNT" -gt 0 ]; then
    echo "   Recent reports:"
    run_query "SELECT '   - ' || topic || ' (Status: ' || status || ', Created: ' || \"createdAt\" || ')' FROM \"DeepResearchReport\" ORDER BY \"createdAt\" DESC LIMIT 3;"
fi
echo ""

# Check Custom Themes
echo "🎨 Checking Custom Themes..."
THEME_COUNT=$(run_query "SELECT COUNT(*) FROM \"CustomTheme\";")
echo "   Total custom themes: $THEME_COUNT"
echo ""

# Check Generated Images
echo "🖼️  Checking Generated Images..."
IMAGE_COUNT=$(run_query "SELECT COUNT(*) FROM \"GeneratedImage\";")
echo "   Total generated images: $IMAGE_COUNT"
echo ""

# Check Chat Messages
echo "💬 Checking Chat Messages..."
CHAT_COUNT=$(run_query "SELECT COUNT(*) FROM \"ChatMessage\";")
echo "   Total chat messages: $CHAT_COUNT"
echo ""

# Summary
echo "=============================="
echo "📋 Summary"
echo "=============================="
echo "✅ Presentations: $PRESENTATION_COUNT"
echo "✅ Documents: $DOCUMENT_COUNT"
echo "✅ Research Reports: $RESEARCH_COUNT"
echo "✅ Custom Themes: $THEME_COUNT"
echo "✅ Generated Images: $IMAGE_COUNT"
echo "✅ Chat Messages: $CHAT_COUNT"
echo ""

# Check for recent activity
echo "🕐 Recent Activity (Last 24 hours)..."
RECENT_PRESENTATIONS=$(run_query "SELECT COUNT(*) FROM \"BaseDocument\" WHERE type = 'PRESENTATION' AND \"updatedAt\" > NOW() - INTERVAL '24 hours';")
RECENT_DOCUMENTS=$(run_query "SELECT COUNT(*) FROM \"Document\" WHERE \"updatedAt\" > NOW() - INTERVAL '24 hours';")
RECENT_RESEARCH=$(run_query "SELECT COUNT(*) FROM \"DeepResearchReport\" WHERE \"createdAt\" > NOW() - INTERVAL '24 hours';")

echo "   Presentations updated: $RECENT_PRESENTATIONS"
echo "   Documents updated: $RECENT_DOCUMENTS"
echo "   Research reports created: $RECENT_RESEARCH"
echo ""

# Recommendations
echo "=============================="
echo "💡 Recommendations"
echo "=============================="

if [ "$PRESENTATION_COUNT" -eq 0 ]; then
    echo "⚠️  No presentations found. Try creating one to test."
fi

if [ "$DOCUMENT_COUNT" -eq 0 ]; then
    echo "⚠️  No documents found. Try saving a document in the AI editor."
fi

if [ "$RESEARCH_COUNT" -eq 0 ]; then
    echo "⚠️  No research reports found. Try generating a deep research report."
fi

if [ "$RECENT_PRESENTATIONS" -eq 0 ] && [ "$PRESENTATION_COUNT" -gt 0 ]; then
    echo "⚠️  No recent presentation updates. Auto-save may not be working."
fi

echo ""
echo "✅ Verification complete!"
echo ""
echo "To view data visually, run: pnpm db:studio"
