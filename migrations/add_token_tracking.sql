-- Migration: Add Token Tracking System
-- Created: 2025-10-21
-- Description: Adds TokenUsage table and updates User table with token statistics

-- Step 1: Add token tracking fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "totalInputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalOutputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "totalTokenCost" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Step 2: Create TokenUsage table
CREATE TABLE IF NOT EXISTS "TokenUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "operationId" TEXT,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "totalTokens" INTEGER NOT NULL,
    "modelProvider" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "inputCost" DOUBLE PRECISION NOT NULL,
    "outputCost" DOUBLE PRECISION NOT NULL,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenUsage_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes for TokenUsage
CREATE INDEX IF NOT EXISTS "TokenUsage_userId_idx" ON "TokenUsage"("userId");
CREATE INDEX IF NOT EXISTS "TokenUsage_operation_idx" ON "TokenUsage"("operation");
CREATE INDEX IF NOT EXISTS "TokenUsage_modelProvider_idx" ON "TokenUsage"("modelProvider");
CREATE INDEX IF NOT EXISTS "TokenUsage_createdAt_idx" ON "TokenUsage"("createdAt");
CREATE INDEX IF NOT EXISTS "TokenUsage_userId_createdAt_idx" ON "TokenUsage"("userId", "createdAt");

-- Step 4: Add foreign key constraint
ALTER TABLE "TokenUsage" 
ADD CONSTRAINT "TokenUsage_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Verify the changes
SELECT 
    'TokenUsage table created' as status,
    COUNT(*) as row_count 
FROM "TokenUsage";

SELECT 
    'User table updated' as status,
    COUNT(*) as user_count 
FROM "User";
