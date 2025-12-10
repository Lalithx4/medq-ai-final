-- Add RLS policies for PdfChatMessage table

-- Enable RLS if not already enabled
ALTER TABLE "PdfChatMessage" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own chat messages" ON "PdfChatMessage";
DROP POLICY IF EXISTS "Users can insert their own chat messages" ON "PdfChatMessage";
DROP POLICY IF EXISTS "Users can update their own chat messages" ON "PdfChatMessage";
DROP POLICY IF EXISTS "Users can delete their own chat messages" ON "PdfChatMessage";

-- Create RLS policies
-- Note: PdfChatMessage doesn't have a userId column, so we check through the session
CREATE POLICY "Users can view messages from their sessions"
ON "PdfChatMessage" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "PdfChatSession"
    WHERE "PdfChatSession"."id" = "PdfChatMessage"."sessionId"
    AND "PdfChatSession"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can insert messages to their sessions"
ON "PdfChatMessage" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "PdfChatSession"
    WHERE "PdfChatSession"."id" = "PdfChatMessage"."sessionId"
    AND "PdfChatSession"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update messages in their sessions"
ON "PdfChatMessage" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "PdfChatSession"
    WHERE "PdfChatSession"."id" = "PdfChatMessage"."sessionId"
    AND "PdfChatSession"."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete messages from their sessions"
ON "PdfChatMessage" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "PdfChatSession"
    WHERE "PdfChatSession"."id" = "PdfChatMessage"."sessionId"
    AND "PdfChatSession"."userId" = auth.uid()::text
  )
);
