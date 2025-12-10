/**
 * Quick test to verify stream format
 */

async function testStreamFormat() {
  console.log("Testing stream format from outline-cerebras API...\n");
  
  const response = await fetch("http://localhost:3000/api/presentation/outline-cerebras", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add your auth cookie here if needed
    },
    body: JSON.stringify({
      prompt: "Test presentation about AI",
      numberOfCards: 3,
      language: "en-US",
      modelProvider: "cerebras",
      modelId: "llama3.1-70b",
    }),
  });

  console.log("Response status:", response.status);
  console.log("Response headers:");
  response.headers.forEach((value, key) => {
    console.log(`  ${key}: ${value}`);
  });

  if (!response.ok) {
    console.error("Error:", await response.text());
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    console.error("No reader available");
    return;
  }

  const decoder = new TextDecoder();
  let fullText = "";
  let chunkCount = 0;

  console.log("\n📡 Reading stream...\n");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    chunkCount++;

    // Show first few chunks
    if (chunkCount <= 5) {
      console.log(`Chunk ${chunkCount}:`, chunk.substring(0, 100));
    }
  }

  console.log("\n✅ Stream complete!");
  console.log("Total chunks:", chunkCount);
  console.log("Total length:", fullText.length);
  console.log("\nFirst 500 chars:");
  console.log(fullText.substring(0, 500));
  console.log("\nLast 200 chars:");
  console.log(fullText.substring(fullText.length - 200));

  // Parse the format
  console.log("\n📊 Analyzing format:");
  const lines = fullText.split('\n').filter(Boolean);
  const textChunks = lines.filter(l => l.startsWith('0:'));
  const events = lines.filter(l => l.startsWith('e:'));
  const errors = lines.filter(l => l.startsWith('3:'));

  console.log("- Text chunks (0:):", textChunks.length);
  console.log("- Events (e:):", events.length);
  console.log("- Errors (3:):", errors.length);

  // Reconstruct content
  let reconstructed = "";
  for (const line of lines) {
    if (line.startsWith('0:')) {
      const json = line.substring(2);
      try {
        const parsed = JSON.parse(json);
        reconstructed += parsed;
      } catch (e) {
        console.error("Failed to parse:", json.substring(0, 50));
      }
    }
  }

  console.log("\n📄 Reconstructed content:");
  console.log(reconstructed);
}

testStreamFormat().catch(console.error);
