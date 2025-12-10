-- Add metadata column to PdfDocument table
-- This stores RAG-specific metadata like ragMode, ragDocumentId, storeName, etc.

ALTER TABLE "PdfDocument" 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add comment
COMMENT ON COLUMN "PdfDocument".metadata IS 'Stores RAG-specific metadata including ragMode (self-hosted/gemini), ragDocumentId, storeName, and other processing details';
