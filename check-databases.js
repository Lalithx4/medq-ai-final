import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('🔍 CHECKING SUPABASE DATABASE (via Prisma)...\n');
  
  try {
    console.log('📊 SUPABASE DATABASE:');
    console.log('Database URL:', process.env.DATABASE_URL?.slice(0, 50) + '...');
    
    const users = await prisma.user.count();
    const baseDocuments = await prisma.baseDocument.count();
    const presentations = await prisma.presentation.count();
    const deepResearchReports = await prisma.deepResearchReport.count();
    const documents = await prisma.document.count();
    
    console.log(`✅ Users: ${users}`);
    console.log(`✅ Base Documents: ${baseDocuments}`);
    console.log(`✅ Presentations: ${presentations}`);
    console.log(`✅ Deep Research Reports: ${deepResearchReports}`);
    console.log(`✅ Documents: ${documents}`);
    
    // Get sample presentations
    const samplePresentations = await prisma.baseDocument.findMany({
      where: { type: 'PRESENTATION' },
      include: { presentation: true },
      take: 3,
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\n🔢 Latest Presentations:');
    if (samplePresentations.length > 0) {
      samplePresentations.forEach((doc, i) => {
        console.log(`${i + 1}. "${doc.title}" - ${new Date(doc.createdAt).toLocaleDateString()}`);
      });
    } else {
      console.log('📝 No presentations found');
    }
    
  } catch (error) {
    console.error('❌ Database Error:', error instanceof Error ? error.message : String(error));
  }
  
  console.log('\n\n🔍 DATABASE SUMMARY:');
  console.log('=====================');
  console.log('PRIMARY DATABASE: Supabase PostgreSQL (via Prisma)');
  console.log('CONNECTION: Direct connection via DATABASE_URL and DIRECT_URL');
  
  await prisma.$disconnect();
}

checkDatabase().catch(console.error);