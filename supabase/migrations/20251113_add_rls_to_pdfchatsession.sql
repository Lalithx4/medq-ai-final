-- Add RLS policies for PdfChatSession table

-- Enable RLS if not already enabled
ALTER TABLE "PdfChatSession" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own chat sessions" ON "PdfChatSession";
DROP POLICY IF EXISTS "Users can insert their own chat sessions" ON "PdfChatSession";
DROP POLICY IF EXISTS "Users can update their own chat sessions" ON "PdfChatSession";
DROP POLICY IF EXISTS "Users can delete their own chat sessions" ON "PdfChatSession";

-- Create RLS policies
CREATE POLICY "Users can view their own chat sessions"
ON "PdfChatSession" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can insert their own chat sessions"
ON "PdfChatSession" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update their own chat sessions"
ON "PdfChatSession" FOR UPDATE
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can delete their own chat sessions"
ON "PdfChatSession" FOR DELETE
USING (auth.uid()::text = "userId");
