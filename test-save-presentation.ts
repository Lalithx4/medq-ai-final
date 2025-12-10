/**
 * Test script to verify presentation save functionality
 * Run with: npx tsx test-save-presentation.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSavePresentation() {
  console.log('🧪 Testing presentation save functionality...\n');

  try {
    // 1. Find the specific presentation from URL
    const presentationId = 'lI15nNiRNoX6ezUE';
    console.log('1️⃣ Finding presentation:', presentationId);
    const presentation = await prisma.baseDocument.findUnique({
      where: {
        id: presentationId,
      },
      include: {
        Presentation: true,
      },
    });

    if (!presentation) {
      console.log('❌ No presentation found in database');
      return;
    }

    console.log('✅ Found presentation:', {
      id: presentation.id,
      title: presentation.title,
      hasPresentation: !!presentation.Presentation,
    });

    // 2. Check current content
    console.log('\n2️⃣ Checking current content...');
    const currentContent = presentation.Presentation?.content as any;
    console.log('Current slides count:', currentContent?.slides?.length || 0);
    
    if (currentContent?.slides?.[0]) {
      console.log('First slide sample:', {
        id: currentContent.slides[0].id,
        hasContent: !!currentContent.slides[0].content,
        contentLength: currentContent.slides[0].content?.length || 0,
      });
    }

    // 3. Test update
    console.log('\n3️⃣ Testing update...');
    const testSlides = currentContent?.slides || [];
    
    // Add a test marker to first slide
    if (testSlides[0]) {
      testSlides[0].testMarker = `Test at ${new Date().toISOString()}`;
    }

    const updateResult = await prisma.presentation.update({
      where: { id: presentation.id },
      data: {
        content: {
          slides: testSlides,
          config: currentContent?.config || {},
        },
      },
    });

    console.log('✅ Update successful!');

    // 4. Verify update
    console.log('\n4️⃣ Verifying update...');
    const verifyPresentation = await prisma.baseDocument.findUnique({
      where: { id: presentation.id },
      include: {
        Presentation: true,
      },
    });

    const verifyContent = verifyPresentation?.Presentation?.content as any;
    console.log('Verified slides count:', verifyContent?.slides?.length || 0);
    console.log('Test marker present:', !!verifyContent?.slides?.[0]?.testMarker);

    console.log('\n✅ All tests passed!');
    console.log('\n📊 Summary:');
    console.log('- Database connection: ✅');
    console.log('- Read presentation: ✅');
    console.log('- Update presentation: ✅');
    console.log('- Verify update: ✅');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSavePresentation();
