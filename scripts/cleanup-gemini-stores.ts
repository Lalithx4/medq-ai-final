/**
 * Cleanup utility for Gemini File Search Stores
 * Run with: npx tsx scripts/cleanup-gemini-stores.ts
 */

import { getGeminiFileSearchService } from '../src/lib/rag/gemini-file-search';

async function main() {
  console.log('🧹 Starting Gemini File Search Store cleanup...\n');

  const geminiService = getGeminiFileSearchService();

  // List all stores
  console.log('📋 Fetching all stores...');
  const stores = await geminiService.listAllStores();

  if (stores.length === 0) {
    console.log('✅ No stores found. Nothing to clean up.');
    return;
  }

  console.log(`\n📊 Found ${stores.length} store(s):\n`);
  stores.forEach((store: any, index: number) => {
    console.log(`${index + 1}. ${store.name}`);
    console.log(`   Display Name: ${store.displayName || 'N/A'}`);
    console.log(`   Created: ${store.createTime || 'N/A'}`);
    console.log('');
  });

  // In a real scenario, you might want to:
  // 1. Filter stores older than X days
  // 2. Prompt user for confirmation
  // 3. Delete selected stores

  console.log('ℹ️  To delete a specific store, use:');
  console.log('   await geminiService.deleteStore("fileSearchStores/xxx")');
  console.log('\n⚠️  Manual deletion recommended to avoid accidental data loss.');
}

main().catch(console.error);
