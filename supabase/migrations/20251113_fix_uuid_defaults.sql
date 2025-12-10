-- Fix UUID default values for PDF chat tables

-- PdfChatSession
ALTER TABLE "PdfChatSession" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- PdfChatMessage
ALTER TABLE "PdfChatMessage" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- MedicalChunk
ALTER TABLE "MedicalChunk" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- MedicalEntity
ALTER TABLE "MedicalEntity" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
