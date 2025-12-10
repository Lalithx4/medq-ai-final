#!/usr/bin/env node
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scripts/check-presentation.mjs <base_document_id>');
    process.exit(1);
  }
  try {
    const doc = await prisma.baseDocument.findUnique({
      where: { id },
      include: { presentation: true },
    });
    if (!doc) {
      console.log(JSON.stringify({ found: false, id }, null, 2));
      process.exit(0);
    }
    const result = {
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      hasPresentation: !!doc.presentation,
      slidesCount: Array.isArray(doc.presentation?.content?.slides)
        ? doc.presentation.content.slides.length
        : (Array.isArray((doc.presentation?.content||{}).slides) ? (doc.presentation.content||{}).slides.length : undefined),
      outlineCount: Array.isArray(doc.presentation?.outline)
        ? doc.presentation.outline.length
        : undefined,
      theme: doc.presentation?.theme,
      language: doc.presentation?.language,
    };
    console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('Error:', err?.message || String(err));
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main();
