import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPresentation() {
  try {
    // Get the most recent presentation
    const presentations = await prisma.baseDocument.findMany({
      where: {
        type: 'PRESENTATION',
      },
      include: {
        Presentation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (presentations.length === 0) {
      console.log('❌ No presentations found');
      return;
    }

    const presentation = presentations[0];
    console.log('\n📊 Latest Presentation:');
    console.log('ID:', presentation.id);
    console.log('Title:', presentation.title);
    console.log('Created:', presentation.createdAt);
    console.log('\n📄 Presentation Data:');
    
    if (presentation.Presentation) {
      console.log('Theme:', presentation.Presentation.theme);
      console.log('Language:', presentation.Presentation.language);
      console.log('Outline:', presentation.Presentation.outline);
      
      const content = presentation.Presentation.content as any;
      console.log('\n📝 Content Structure:');
      console.log('Type:', typeof content);
      console.log('Keys:', Object.keys(content));
      
      if (content.slides) {
        console.log('\n🎯 Slides:');
        console.log('Number of slides:', content.slides.length);
        
        if (content.slides.length > 0) {
          console.log('\n📄 First slide:');
          console.log(JSON.stringify(content.slides[0], null, 2));
        } else {
          console.log('⚠️  Slides array is empty!');
        }
      } else {
        console.log('❌ No slides property in content!');
        console.log('Content:', JSON.stringify(content, null, 2));
      }
    } else {
      console.log('❌ No Presentation relation found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPresentation();
