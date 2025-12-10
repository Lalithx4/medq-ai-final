/**
 * Test script to debug outline generation
 * Tests the full flow: API -> Parser -> State
 */

import Cerebras from "@cerebras/cerebras_cloud_sdk";

// Test 1: Direct Cerebras API call
async function testCerebrasAPI() {
  console.log("\n========== TEST 1: Direct Cerebras API ==========");
  
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    console.error("❌ CEREBRAS_API_KEY not found in environment");
    return false;
  }
  
  console.log("✅ API Key found:", apiKey.substring(0, 10) + "...");
  
  const cerebras = new Cerebras({ apiKey });
  
  const prompt = "Immunotherapy in Breast Cancer Management";
  const numberOfCards = 5;
  const language = "English (US)";
  
  const outlinePrompt = `You are an expert presentation outline generator. Create a structured outline for a presentation.

Topic: ${prompt}
Language: ${language}
Number of slides needed: ${numberOfCards}

First, generate an appropriate title for the presentation, then create exactly ${numberOfCards} main topics.

Format the response starting with the title in XML tags, followed by markdown content:

Example format:
<TITLE>Your Generated Presentation Title Here</TITLE>

# First Main Topic
- Key point about this topic
- Another important aspect
- Brief conclusion or impact

# Second Main Topic
- Main insight for this section
- Supporting detail or example
- Practical application or takeaway`;

  try {
    console.log("🚀 Calling Cerebras API...");
    const stream = await cerebras.chat.completions.create({
      model: "llama-3.3-70b",
      messages: [
        {
          role: "system",
          content: "You are an expert presentation outline generator.",
        },
        {
          role: "user",
          content: outlinePrompt,
        },
      ],
      stream: true,
      max_completion_tokens: 2000,
      temperature: 0.7,
    });

    let fullContent = "";
    let chunkCount = 0;
    
    console.log("📡 Streaming response...");
    for await (const chunk of stream) {
      const content = (chunk as any).choices?.[0]?.delta?.content || "";
      if (content) {
        fullContent += content;
        chunkCount++;
        
        if (chunkCount % 10 === 0) {
          process.stdout.write(".");
        }
      }
    }
    
    console.log("\n✅ Stream completed!");
    console.log("📊 Total chunks:", chunkCount);
    console.log("📏 Total length:", fullContent.length);
    console.log("\n📄 Full content:");
    console.log("─".repeat(80));
    console.log(fullContent);
    console.log("─".repeat(80));
    
    return fullContent;
  } catch (error) {
    console.error("❌ Cerebras API error:", error);
    return false;
  }
}

// Test 2: Parse the outline content
function testOutlineParser(content: string) {
  console.log("\n========== TEST 2: Outline Parser ==========");
  
  // Extract title
  const titleMatch = content.match(/<TITLE>(.*?)<\/TITLE>/i);
  if (titleMatch?.[1]) {
    const title = titleMatch[1].trim();
    console.log("✅ Title extracted:", title);
  } else {
    console.error("❌ No title found in content");
  }
  
  // Remove title from content
  let cleanContent = content.replace(/<TITLE>.*?<\/TITLE>/i, "").trim();
  console.log("📏 Clean content length:", cleanContent.length);
  
  // Parse sections
  const sections = cleanContent.split(/^# /gm).filter(Boolean);
  console.log("📋 Sections found:", sections.length);
  
  const outlineItems = sections.map((section) => `# ${section}`.trim());
  
  console.log("\n📝 Parsed outline items:");
  outlineItems.forEach((item, index) => {
    const lines = item.split('\n');
    console.log(`\n${index + 1}. ${lines[0]}`);
    lines.slice(1, 4).forEach(line => {
      if (line.trim()) {
        console.log(`   ${line.trim()}`);
      }
    });
  });
  
  return outlineItems;
}

// Test 3: Simulate the API endpoint
async function testAPIEndpoint() {
  console.log("\n========== TEST 3: API Endpoint Simulation ==========");
  
  const requestBody = {
    prompt: "Immunotherapy in Breast Cancer Management",
    numberOfCards: 5,
    language: "en-US",
    modelProvider: "cerebras",
    modelId: "llama3.1-70b",
  };
  
  console.log("📦 Request body:", JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch("http://localhost:3000/api/presentation/outline-cerebras", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log("📡 Response status:", response.status);
    console.log("📋 Response headers:", Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API error:", errorText);
      return false;
    }
    
    // Read the stream
    const reader = response.body?.getReader();
    if (!reader) {
      console.error("❌ No reader available");
      return false;
    }
    
    const decoder = new TextDecoder();
    let fullContent = "";
    let chunkCount = 0;
    
    console.log("📡 Reading stream...");
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullContent += chunk;
      chunkCount++;
      
      if (chunkCount % 10 === 0) {
        process.stdout.write(".");
      }
    }
    
    console.log("\n✅ Stream read complete!");
    console.log("📊 Total chunks:", chunkCount);
    console.log("📏 Total length:", fullContent.length);
    console.log("\n📄 Raw stream content (first 500 chars):");
    console.log(fullContent.substring(0, 500));
    
    // Parse AI SDK format
    const lines = fullContent.split('\n').filter(Boolean);
    let extractedContent = "";
    
    for (const line of lines) {
      if (line.startsWith('0:')) {
        // Text chunk
        const jsonStr = line.substring(2);
        try {
          const parsed = JSON.parse(jsonStr);
          extractedContent += parsed;
        } catch (e) {
          console.warn("⚠️ Failed to parse chunk:", line.substring(0, 50));
        }
      } else if (line.startsWith('e:')) {
        console.log("✅ Completion marker received");
      }
    }
    
    console.log("\n📄 Extracted content:");
    console.log("─".repeat(80));
    console.log(extractedContent);
    console.log("─".repeat(80));
    
    return extractedContent;
  } catch (error) {
    console.error("❌ API endpoint test error:", error);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log("🧪 Starting Outline Generation Debug Tests");
  console.log("=".repeat(80));
  
  // Test 1: Direct API
  const content = await testCerebrasAPI();
  if (!content) {
    console.error("\n❌ Test 1 failed - cannot proceed");
    process.exit(1);
  }
  
  // Test 2: Parser
  const outlineItems = testOutlineParser(content as string);
  if (!outlineItems || outlineItems.length === 0) {
    console.error("\n❌ Test 2 failed - parser issues");
    process.exit(1);
  }
  
  // Test 3: API Endpoint (requires server running)
  console.log("\n⚠️  Test 3 requires the Next.js server to be running");
  console.log("   Run 'npm run dev' in another terminal first");
  console.log("   Press Ctrl+C to skip, or wait 5 seconds to continue...");
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const apiContent = await testAPIEndpoint();
  if (apiContent) {
    console.log("\n✅ Test 3 passed - API endpoint working");
    testOutlineParser(apiContent as string);
  } else {
    console.log("\n⚠️  Test 3 skipped or failed - check if server is running");
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("🎉 Tests completed!");
}

runAllTests().catch(console.error);
