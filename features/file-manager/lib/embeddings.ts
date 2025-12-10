import { GoogleGenAI } from "@google/genai";

// Initialize Gemini client
const gemini = new GoogleGenAI({ 
  apiKey: process.env.GOOGLE_AI_API_KEY || "" 
});

// Embedding model - Gemini's free embedding model
const EMBEDDING_MODEL = "text-embedding-004";

// Chunk text for embedding
export function chunkText(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
  } = {}
): { text: string; index: number }[] {
  const { chunkSize = 500, overlap = 50 } = options;
  const chunks: { text: string; index: number }[] = [];
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  let chunkIndex = 0;
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph exceeds chunk size, save current and start new
    if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
      chunks.push({ text: currentChunk.trim(), index: chunkIndex++ });
      
      // Keep overlap from end of current chunk
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }
  
  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push({ text: currentChunk.trim(), index: chunkIndex });
  }
  
  return chunks;
}

// Generate embeddings using Gemini (free)
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!process.env.GOOGLE_AI_API_KEY) {
      console.warn("GOOGLE_AI_API_KEY not set, skipping embedding generation");
      return null;
    }
    
    const response = await gemini.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: [{ parts: [{ text: text.slice(0, 8000) }] }], // Limit input length
    });
    
    return response.embeddings?.[0]?.values || null;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Generate embeddings for multiple chunks
export async function generateChunkEmbeddings(
  chunks: { text: string; index: number }[]
): Promise<{ text: string; index: number; embedding: number[] }[]> {
  const results: { text: string; index: number; embedding: number[] }[] = [];
  
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.warn("GOOGLE_AI_API_KEY not set, skipping embedding generation");
    return results;
  }
  
  // Process in batches of 20 to avoid rate limits
  const batchSize = 20;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    try {
      // Generate embeddings one at a time (Gemini doesn't have batch embedding like OpenAI)
      for (const chunk of batch) {
        const embedding = await generateEmbedding(chunk.text);
        if (embedding) {
          results.push({
            text: chunk.text,
            index: chunk.index,
            embedding,
          });
        }
      }
    } catch (error) {
      console.error('Error generating batch embeddings:', error);
      // Skip failed batch but continue
    }
    
    // Small delay between batches
    if (i + batchSize < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Cosine similarity between two vectors
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    const aVal = a[i] ?? 0;
    const bVal = b[i] ?? 0;
    dotProduct += aVal * bVal;
    normA += aVal * aVal;
    normB += bVal * bVal;
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Find most similar chunks given a query
export function findSimilarChunks(
  queryEmbedding: number[],
  chunks: { text: string; embedding: number[] }[],
  topK: number = 5
): { text: string; similarity: number }[] {
  const scored = chunks.map(chunk => ({
    text: chunk.text,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));
  
  return scored
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
