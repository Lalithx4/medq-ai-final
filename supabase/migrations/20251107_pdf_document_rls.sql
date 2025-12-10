-- =====================================================
-- PDF Chat - Enable RLS for PdfDocument table
-- =====================================================

-- Enable RLS
ALTER TABLE "PdfDocument" ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own documents" ON "PdfDocument";
DROP POLICY IF EXISTS "Users can insert their own documents" ON "PdfDocument";
DROP POLICY IF EXISTS "Users can update their own documents" ON "PdfDocument";
DROP POLICY IF EXISTS "Users can delete their own documents" ON "PdfDocument";
DROP POLICY IF EXISTS "Service role full access" ON "PdfDocument";

-- Create RLS policies
CREATE POLICY "Users can view their own documents"
ON "PdfDocument" FOR SELECT
USING (userId = auth.uid());

CREATE POLICY "Users can insert their own documents"
ON "PdfDocument" FOR INSERT
WITH CHECK (userId = auth.uid());

CREATE POLICY "Users can update their own documents"
ON "PdfDocument" FOR UPDATE
USING (userId = auth.uid());

CREATE POLICY "Users can delete their own documents"
ON "PdfDocument" FOR DELETE
USING (userId = auth.uid());

CREATE POLICY "Service role full access"
ON "PdfDocument" FOR ALL
USING (auth.role() = 'service_role');
