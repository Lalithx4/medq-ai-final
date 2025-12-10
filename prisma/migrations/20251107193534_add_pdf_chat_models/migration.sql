-- CreateTable
CREATE TABLE "PdfDocument" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalChunk" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "chunkIdx" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "embedding" vector(768) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalEntity" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityText" TEXT NOT NULL,
    "startChar" INTEGER,
    "endChar" INTEGER,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MedicalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfChatSession" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "documentId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PdfChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PdfChatMessage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sources" JSONB,
    "confidenceScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PdfChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PdfDocument_userId_idx" ON "PdfDocument"("userId");

-- CreateIndex
CREATE INDEX "PdfDocument_status_idx" ON "PdfDocument"("status");

-- CreateIndex
CREATE INDEX "PdfDocument_createdAt_idx" ON "PdfDocument"("createdAt");

-- CreateIndex
CREATE INDEX "MedicalChunk_documentId_idx" ON "MedicalChunk"("documentId");

-- CreateIndex
CREATE INDEX "MedicalChunk_userId_idx" ON "MedicalChunk"("userId");

-- CreateIndex
CREATE INDEX "MedicalChunk_pageNumber_idx" ON "MedicalChunk"("pageNumber");

-- CreateIndex
CREATE INDEX "MedicalEntity_documentId_idx" ON "MedicalEntity"("documentId");

-- CreateIndex
CREATE INDEX "MedicalEntity_userId_idx" ON "MedicalEntity"("userId");

-- CreateIndex
CREATE INDEX "MedicalEntity_entityType_idx" ON "MedicalEntity"("entityType");

-- CreateIndex
CREATE INDEX "MedicalEntity_entityName_idx" ON "MedicalEntity"("entityName");

-- CreateIndex
CREATE INDEX "PdfChatSession_documentId_idx" ON "PdfChatSession"("documentId");

-- CreateIndex
CREATE INDEX "PdfChatSession_userId_idx" ON "PdfChatSession"("userId");

-- CreateIndex
CREATE INDEX "PdfChatSession_createdAt_idx" ON "PdfChatSession"("createdAt");

-- CreateIndex
CREATE INDEX "PdfChatMessage_sessionId_idx" ON "PdfChatMessage"("sessionId");

-- CreateIndex
CREATE INDEX "PdfChatMessage_createdAt_idx" ON "PdfChatMessage"("createdAt");

-- AddForeignKey
ALTER TABLE "PdfDocument" ADD CONSTRAINT "PdfDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalChunk" ADD CONSTRAINT "MedicalChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PdfDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalChunk" ADD CONSTRAINT "MedicalChunk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEntity" ADD CONSTRAINT "MedicalEntity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PdfDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalEntity" ADD CONSTRAINT "MedicalEntity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfChatSession" ADD CONSTRAINT "PdfChatSession_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PdfDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfChatSession" ADD CONSTRAINT "PdfChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PdfChatMessage" ADD CONSTRAINT "PdfChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PdfChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
