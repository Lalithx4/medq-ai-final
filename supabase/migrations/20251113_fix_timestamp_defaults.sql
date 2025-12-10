-- Fix timestamp default values for PDF chat tables

-- PdfChatSession
ALTER TABLE "PdfChatSession" 
ALTER COLUMN "createdAt" SET DEFAULT NOW(),
ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- PdfChatMessage  
ALTER TABLE "PdfChatMessage" 
ALTER COLUMN "createdAt" SET DEFAULT NOW();

-- MedicalChunk
ALTER TABLE "MedicalChunk" 
ALTER COLUMN "createdAt" SET DEFAULT NOW();

-- MedicalEntity
ALTER TABLE "MedicalEntity" 
ALTER COLUMN "createdAt" SET DEFAULT NOW();
