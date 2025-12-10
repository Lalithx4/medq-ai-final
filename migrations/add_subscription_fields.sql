-- Add subscription tracking fields to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "subscriptionStart" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "lastCreditRefresh" TIMESTAMP(3);

-- Update comment for subscriptionPlan
COMMENT ON COLUMN "User"."subscriptionPlan" IS 'free, basic, pro (enterprise removed)';

-- Create index for efficient subscription queries
CREATE INDEX IF NOT EXISTS "User_subscriptionEnd_idx" ON "User"("subscriptionEnd");
CREATE INDEX IF NOT EXISTS "User_lastCreditRefresh_idx" ON "User"("lastCreditRefresh");
CREATE INDEX IF NOT EXISTS "User_subscriptionPlan_idx" ON "User"("subscriptionPlan");
