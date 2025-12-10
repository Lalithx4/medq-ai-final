#!/bin/bash

# Fix all Supabase table names to use snake_case

echo "🔧 Fixing Supabase table names in API routes..."

# Fix table names
find src/app/api/pdf-chat -type f -name "*.ts" -exec sed -i '' \
  -e 's/\.from("PdfDocument")/.from("pdf_documents")/g' \
  -e 's/\.from("PdfCollection")/.from("pdf_collections")/g' \
  -e 's/\.from("PdfChatSession")/.from("pdf_chat_sessions")/g' \
  -e 's/\.from("PdfChatMessage")/.from("pdf_chat_messages")/g' \
  {} \;

# Fix select joins
find src/app/api/pdf-chat -type f -name "*.ts" -exec sed -i '' \
  -e 's/PdfDocument(/pdf_documents(/g' \
  -e 's/PdfCollection(/pdf_collections(/g' \
  -e 's/PdfChatSession(/pdf_chat_sessions(/g' \
  {} \;

# Fix column names in common patterns
find src/app/api/pdf-chat -type f -name "*.ts" -exec sed -i '' \
  -e 's/\.eq("userId",/.eq("user_id",/g' \
  -e 's/\.eq("documentId",/.eq("document_id",/g' \
  -e 's/\.eq("collectionId",/.eq("collection_id",/g' \
  -e 's/\.eq("sessionId",/.eq("session_id",/g' \
  -e 's/\.order("createdAt",/.order("created_at",/g' \
  -e 's/\.order("updatedAt",/.order("updated_at",/g' \
  {} \;

# Fix insert/update field names (more complex, need to be careful)
find src/app/api/pdf-chat -type f -name "*.ts" -exec sed -i '' \
  -e 's/userId:/user_id:/g' \
  -e 's/documentId:/document_id:/g' \
  -e 's/collectionId:/collection_id:/g' \
  -e 's/sessionId:/session_id:/g' \
  -e 's/originalName:/original_filename:/g' \
  -e 's/fileUrl:/file_url:/g' \
  -e 's/fileSize:/file_size:/g' \
  -e 's/pageCount:/page_count:/g' \
  -e 's/processingError:/error_message:/g' \
  -e 's/createdAt:/created_at:/g' \
  -e 's/updatedAt:/updated_at:/g' \
  -e 's/fileSearchStoreId:/file_search_store_id:/g' \
  -e 's/confidenceScore:/confidence_score:/g' \
  {} \;

echo "✅ Fixed all Supabase table and column names!"
echo "📝 Please review the changes before committing."
