/**
 * Simple test to check outline generation flow
 */

// Test the outline parsing logic
function testOutlineParsing() {
  console.log("========== Testing Outline Parsing ==========\n");
  
  // Sample outline content (what should come from API)
  const sampleContent = `<TITLE>Immunotherapy in Breast Cancer Management: Advances and Outlook</TITLE>

# Introduction to Immunotherapy in Breast Cancer
- Overview of immunotherapy as a treatment modality
- Historical context and evolution of immunotherapy in oncology
- Current state of immunotherapy in breast cancer treatment

# Mechanisms of Immunotherapy
- How immunotherapy works to target cancer cells
- Key immune checkpoints and their role in cancer progression
- Differences between immunotherapy and traditional treatments

# Types of Immunotherapy for Breast Cancer
- Checkpoint inhibitors and their applications
- Adoptive cell therapy approaches
- Cancer vaccines and their development status

# Clinical Trials and Evidence
- Major clinical trials demonstrating efficacy
- Patient populations most likely to benefit
- Combination therapies and their outcomes

# Future Directions and Challenges
- Emerging immunotherapy strategies
- Overcoming resistance mechanisms
- Personalized immunotherapy approaches`;

  console.log("📄 Sample content:");
  console.log(sampleContent);
  console.log("\n" + "─".repeat(80) + "\n");
  
  // Step 1: Extract title
  console.log("Step 1: Extract Title");
  const titleMatch = sampleContent.match(/<TITLE>(.*?)<\/TITLE>/i);
  if (titleMatch?.[1]) {
    const title = titleMatch[1].trim();
    console.log("✅ Title:", title);
  } else {
    console.log("❌ No title found");
  }
  
  // Step 2: Remove title and clean content
  console.log("\nStep 2: Clean Content");
  let cleanContent = sampleContent.replace(/<TITLE>.*?<\/TITLE>/i, "").trim();
  console.log("✅ Clean content length:", cleanContent.length);
  console.log("First 100 chars:", cleanContent.substring(0, 100));
  
  // Step 3: Split by markdown headers
  console.log("\nStep 3: Split by Headers");
  const sections = cleanContent.split(/^# /gm).filter(Boolean);
  console.log("✅ Sections found:", sections.length);
  
  // Step 4: Map to outline items
  console.log("\nStep 4: Create Outline Items");
  const outlineItems = sections.map((section) => `# ${section}`.trim());
  console.log("✅ Outline items created:", outlineItems.length);
  
  // Step 5: Display parsed outline
  console.log("\n" + "─".repeat(80));
  console.log("📋 PARSED OUTLINE:");
  console.log("─".repeat(80));
  outlineItems.forEach((item, index) => {
    const lines = item.split('\n');
    console.log(`\n${index + 1}. ${lines[0]}`);
    lines.slice(1).forEach(line => {
      if (line.trim()) {
        console.log(`   ${line.trim()}`);
      }
    });
  });
  
  console.log("\n" + "─".repeat(80));
  console.log("✅ Parsing test completed successfully!");
  
  return { title: titleMatch?.[1]?.trim(), outlineItems };
}

// Test what happens in the manager
function testManagerFlow() {
  console.log("\n\n========== Testing Manager Flow ==========\n");
  
  const mockMessages = [
    {
      role: "user",
      content: "Create a presentation about immunotherapy in breast cancer"
    },
    {
      role: "assistant",
      content: `<TITLE>Immunotherapy in Breast Cancer Management</TITLE>

# Introduction to Immunotherapy
- Overview of immunotherapy as a treatment modality
- Historical context and evolution
- Current state in breast cancer treatment

# Mechanisms of Action
- How immunotherapy targets cancer cells
- Key immune checkpoints
- Differences from traditional treatments`
    }
  ];
  
  console.log("📬 Simulating message processing...");
  console.log("Messages count:", mockMessages.length);
  
  const lastMessage = mockMessages[mockMessages.length - 1];
  console.log("\n📝 Last message role:", lastMessage?.role);
  console.log("📏 Content length:", lastMessage?.content?.length);
  
  if (lastMessage?.role === "assistant" && lastMessage?.content) {
    console.log("\n✅ Processing assistant message...");
    
    // Extract title
    const titleMatch = lastMessage.content.match(/<TITLE>(.*?)<\/TITLE>/i);
    if (titleMatch?.[1]) {
      console.log("✅ Title extracted:", titleMatch[1].trim());
    } else {
      console.log("❌ No title found - would return early");
      return;
    }
    
    // Clean content
    let cleanContent = lastMessage.content.replace(/<TITLE>.*?<\/TITLE>/i, "").trim();
    
    // Parse sections
    const sections = cleanContent.split(/^# /gm).filter(Boolean);
    const outlineItems = sections.map((section) => `# ${section}`.trim());
    
    console.log("✅ Outline items parsed:", outlineItems.length);
    
    console.log("\n📋 Would set these outline items:");
    outlineItems.forEach((item, i) => {
      const firstLine = item.split('\n')[0];
      console.log(`  ${i + 1}. ${firstLine}`);
    });
  }
  
  console.log("\n✅ Manager flow test completed!");
}

// Run tests
console.log("🧪 OUTLINE GENERATION DEBUG TESTS");
console.log("=".repeat(80));

const result = testOutlineParsing();
testManagerFlow();

console.log("\n" + "=".repeat(80));
console.log("🎉 All tests completed!");
console.log("\n💡 Key findings:");
console.log("  - Title extraction: " + (result.title ? "✅ Working" : "❌ Failed"));
console.log("  - Outline parsing: " + (result.outlineItems.length > 0 ? "✅ Working" : "❌ Failed"));
console.log("  - Expected items: 5");
console.log("  - Actual items: " + result.outlineItems.length);
