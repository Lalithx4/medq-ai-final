import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function checkDatabase() {
  console.log("🔍 Checking Database Saves...\n");

  try {
    // Check Presentations
    console.log("📊 Presentations:");
    const presentationCount = await prisma.baseDocument.count({
      where: { type: "PRESENTATION" },
    });
    console.log(`   Total: ${presentationCount}`);

    if (presentationCount > 0) {
      const recentPresentations = await prisma.baseDocument.findMany({
        where: { type: "PRESENTATION" },
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: {
          title: true,
          updatedAt: true,
        },
      });
      console.log("   Recent:");
      recentPresentations.forEach((p) => {
        console.log(`   - ${p.title} (${p.updatedAt.toLocaleString()})`);
      });
    }
    console.log("");

    // Check Documents
    console.log("📄 Documents:");
    const documentCount = await prisma.document.count();
    console.log(`   Total: ${documentCount}`);

    if (documentCount > 0) {
      const recentDocuments = await prisma.document.findMany({
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: {
          title: true,
          type: true,
          updatedAt: true,
        },
      });
      console.log("   Recent:");
      recentDocuments.forEach((d) => {
        console.log(`   - ${d.title} [${d.type}] (${d.updatedAt.toLocaleString()})`);
      });
    }
    console.log("");

    // Check Deep Research Reports
    console.log("🔬 Deep Research Reports:");
    const researchCount = await prisma.deepResearchReport.count();
    console.log(`   Total: ${researchCount}`);

    if (researchCount > 0) {
      const recentReports = await prisma.deepResearchReport.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          topic: true,
          status: true,
          wordCount: true,
          createdAt: true,
        },
      });
      console.log("   Recent:");
      recentReports.forEach((r) => {
        console.log(
          `   - ${r.topic} [${r.status}] ${r.wordCount ? `(${r.wordCount} words)` : ""} (${r.createdAt.toLocaleString()})`
        );
      });
    }
    console.log("");

    // Check Custom Themes
    console.log("🎨 Custom Themes:");
    const themeCount = await prisma.customTheme.count();
    console.log(`   Total: ${themeCount}`);
    console.log("");

    // Check Generated Images
    console.log("🖼️  Generated Images:");
    const imageCount = await prisma.generatedImage.count();
    console.log(`   Total: ${imageCount}`);
    console.log("");

    // Check Chat Messages
    console.log("💬 Chat Messages:");
    const chatCount = await prisma.chatMessage.count();
    console.log(`   Total: ${chatCount}`);
    console.log("");

    // Recent Activity (last 24 hours)
    console.log("🕐 Recent Activity (Last 24 hours):");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentPresentations = await prisma.baseDocument.count({
      where: {
        type: "PRESENTATION",
        updatedAt: { gte: yesterday },
      },
    });

    const recentDocuments = await prisma.document.count({
      where: {
        updatedAt: { gte: yesterday },
      },
    });

    const recentResearch = await prisma.deepResearchReport.count({
      where: {
        createdAt: { gte: yesterday },
      },
    });

    console.log(`   Presentations updated: ${recentPresentations}`);
    console.log(`   Documents updated: ${recentDocuments}`);
    console.log(`   Research reports created: ${recentResearch}`);
    console.log("");

    // Summary
    console.log("==============================");
    console.log("📋 Summary");
    console.log("==============================");
    console.log(`✅ Presentations: ${presentationCount}`);
    console.log(`✅ Documents: ${documentCount}`);
    console.log(`✅ Research Reports: ${researchCount}`);
    console.log(`✅ Custom Themes: ${themeCount}`);
    console.log(`✅ Generated Images: ${imageCount}`);
    console.log(`✅ Chat Messages: ${chatCount}`);
    console.log("");

    if (presentationCount === 0 && documentCount === 0 && researchCount === 0) {
      console.log("⚠️  No data found. Try:");
      console.log("   1. Create a presentation");
      console.log("   2. Save a document in AI editor");
      console.log("   3. Generate a research report");
    } else {
      console.log("✅ Database is working and saving data!");
    }

    console.log("");
    console.log("💡 Tip: Prisma query logs are now enabled in development mode.");
    console.log("   Check your server console to see all database queries.");
  } catch (error) {
    console.error("❌ Error checking database:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
