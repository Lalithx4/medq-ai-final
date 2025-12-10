# Testing Guide: Gemini File Search Store Debugging

## Problem Summary
Documents uploaded to Gemini File Search were returning incorrect content (e.g., uploading a cybersecurity PDF but getting answers about nuclear energy).

## Fixes Implemented

### 1. **Unique Store Generation** ✅
- Changed from timestamp-based labels to UUID-based labels
- Each document now gets a truly unique store: `doc-{UUID}-{timestamp}`
- Location: `src/lib/rag/unified-rag-service.ts`

### 2. **Comprehensive Logging** ✅
Added detailed logs at every step:

#### Upload Process Logs:
- `🏗️  Creating NEW File Search Store with label: ...`
- `✅ Created dedicated File Search Store:` (with name, displayName, createTime)
- `📤 uploadDocument called:` (fileName, fileSize, requestedStoreName)
- `🎯 Target store resolved to: ...`
- `🚀 Uploading file to Gemini:` (fileName, storeName, fileSize)
- `✅ Upload initiated, operation name: ...`
- `✅ Document uploaded successfully:` (operationName, fileUri, displayName, storeName, state)
- `💾 Persisting metadata to pdf_documents for doc ...`
- `✅ Document ... status updated to READY with metadata:`

#### Chat/Query Logs:
- `📄 Document metadata (full):` (JSON of metadata from DB)
- `🔍 Determining RAG document ID:` (all candidate IDs)
- `📄 ✅ Using Document RAG ID from metadata.ragDocumentId: ...`
- `📋 Listing files in store: ...`
- `📋 Store details:` (name, displayName, createTime)
- `🔍 Querying File Search Store:` (query, storeName)

### 3. **Store Verification** ✅
- Before querying, the system now verifies the store exists
- Logs store details for debugging
- Location: `src/lib/rag/gemini-file-search.ts` → `listFilesInStore()`

### 4. **Cleanup Utilities** ✅
Added methods to manage stores:
- `deleteStore(storeName)` - Delete a specific store
- `listAllStores()` - List all stores for debugging
- Script: `scripts/cleanup-gemini-stores.ts`

## Testing Instructions

### Test 1: Fresh Upload with New Logging

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open browser console** (F12) and **server terminal** side-by-side

3. **Upload a PDF** (single document):
   - Go to `http://localhost:3000/pdf-chat`
   - Upload a PDF (e.g., a cybersecurity document)
   - Watch for these logs in the **server terminal**:

   ```
   🏗️  Creating NEW File Search Store with label: doc-{UUID}-{timestamp}
   ✅ Created dedicated File Search Store: { name: 'fileSearchStores/...', displayName: '...', ... }
   📤 uploadDocument called: { fileName: '...', fileSize: ..., requestedStoreName: '...' }
   🎯 Target store resolved to: fileSearchStores/...
   🚀 Uploading file to Gemini (attempt 1/3): { fileName: '...', storeName: 'fileSearchStores/...', fileSize: ... }
   ✅ Upload initiated, operation name: ...
   ✅ Document uploaded successfully: { operationName: '...', fileUri: '...', displayName: '...', storeName: 'fileSearchStores/...', state: '...' }
   💾 Persisting metadata to pdf_documents for doc ...: { ragMode: 'gemini', ragDocumentId: 'fileSearchStores/...', storeName: 'fileSearchStores/...', ... }
   ✅ Document ... status updated to READY with metadata: { ... }
   ```

4. **Verify the store ID:**
   - Note the `storeName` from the upload logs
   - It should be something like `fileSearchStores/doc-abc123-1234567890`

5. **Wait for processing to complete** (status: "ready")

6. **Open the document chat page** and send a test query like:
   - "What is this document about?"
   - "Summarize the main topics"

7. **Check the chat logs** in the **server terminal**:

   ```
   📄 Document metadata (full): {
     "ragMode": "gemini",
     "storeName": "fileSearchStores/doc-abc123-1234567890",
     "ragDocumentId": "fileSearchStores/doc-abc123-1234567890",
     ...
   }
   🔍 Determining RAG document ID: {
     collStore: undefined,
     docMetaRagDocId: 'fileSearchStores/doc-abc123-1234567890',
     docMetaStoreName: 'fileSearchStores/doc-abc123-1234567890',
     fallbackDocId: '...'
   }
   📄 ✅ Using Document RAG ID from metadata.ragDocumentId: fileSearchStores/doc-abc123-1234567890
   📋 Listing files in store: fileSearchStores/doc-abc123-1234567890
   📋 Store details: { name: '...', displayName: '...', createTime: '...' }
   🔍 Querying File Search Store (attempt 1/3): "..." in store: fileSearchStores/doc-abc123-1234567890
   ✅ Answer generated with File Search
   ```

8. **Verify the answer:**
   - The response should be **relevant to your uploaded PDF**
   - If you uploaded a cybersecurity doc, you should get cybersecurity answers
   - NOT unrelated content (like nuclear energy)

### Test 2: Verify Store ID Consistency

Compare the store IDs from the logs:

1. **Upload store ID** (from `✅ Created dedicated File Search Store`):
   ```
   fileSearchStores/doc-abc123-1234567890
   ```

2. **Persisted store ID** (from `💾 Persisting metadata`):
   ```
   ragDocumentId: "fileSearchStores/doc-abc123-1234567890"
   ```

3. **Retrieved store ID** (from `📄 Document metadata (full)`):
   ```
   "ragDocumentId": "fileSearchStores/doc-abc123-1234567890"
   ```

4. **Query store ID** (from `🔍 Querying File Search Store`):
   ```
   in store: fileSearchStores/doc-abc123-1234567890
   ```

**All four should match exactly!**

### Test 3: Multiple Documents (Isolation Test)

1. **Upload Document A** (e.g., cybersecurity PDF)
   - Note its store ID: `fileSearchStores/doc-AAA-...`

2. **Upload Document B** (e.g., medical PDF)
   - Note its store ID: `fileSearchStores/doc-BBB-...`

3. **Verify store IDs are different:**
   - Store A ≠ Store B

4. **Chat with Document A:**
   - Ask: "What is this about?"
   - Should return cybersecurity content

5. **Chat with Document B:**
   - Ask: "What is this about?"
   - Should return medical content

6. **Verify no cross-contamination:**
   - Document A answers should NOT mention medical topics
   - Document B answers should NOT mention cybersecurity topics

### Test 4: Cleanup Old Stores (Optional)

If you want to clean up test stores:

```bash
npx tsx scripts/cleanup-gemini-stores.ts
```

This will list all stores. To delete a specific store:

```typescript
import { getGeminiFileSearchService } from './src/lib/rag/gemini-file-search';

const service = getGeminiFileSearchService();
await service.deleteStore('fileSearchStores/old-store-id');
```

## What to Look For

### ✅ Success Indicators:
- Each upload creates a NEW store with a unique UUID
- Store ID is consistent from upload → DB → chat → query
- Answers are relevant to the uploaded document
- Different documents get different store IDs
- No cross-contamination between documents

### ❌ Failure Indicators:
- Same store ID reused for different documents
- Store ID changes between upload and chat
- Answers are unrelated to the uploaded document
- Generic/hallucinated answers not grounded in the PDF
- Cross-contamination (Doc A answers mention Doc B content)

## Troubleshooting

### Issue: Still getting wrong content

**Check:**
1. Are the store IDs matching across all logs?
2. Is the UUID generation working? (Should see `doc-{UUID}-{timestamp}`)
3. Is Gemini actually creating a new store? (Check `✅ Created dedicated File Search Store` log)

**Try:**
- Delete old stores using the cleanup script
- Restart the dev server
- Upload a completely new PDF (not one uploaded before)

### Issue: Store creation fails

**Check:**
- `GOOGLE_AI_API_KEY` is set correctly in `.env`
- API key has permissions for File Search Stores
- No rate limiting from Gemini API

### Issue: Upload succeeds but chat fails

**Check:**
- Document status is "ready" (not "processing" or "error")
- Metadata was persisted correctly (check `💾 Persisting metadata` log)
- Store ID in metadata matches the created store

## Expected Log Flow (Summary)

```
UPLOAD:
🏗️  Creating NEW store → ✅ Created store → 📤 uploadDocument → 🎯 Target store → 🚀 Uploading → ✅ Upload initiated → ✅ Uploaded successfully → 💾 Persisting metadata → ✅ Status updated to READY

CHAT:
📄 Document metadata → 🔍 Determining RAG ID → 📄 ✅ Using RAG ID → 📋 Listing files → 📋 Store details → 🔍 Querying store → ✅ Answer generated
```

## Next Steps

After testing:
1. **If successful:** The issue is resolved! Each document now gets its own isolated store.
2. **If still failing:** Copy the full logs (upload + chat) and share them for further debugging.
3. **For production:** Consider adding automated tests to verify store isolation.

## Additional Notes

- The UUID-based store labels ensure absolute uniqueness
- Store verification helps catch issues early
- Comprehensive logging makes debugging much easier
- Cleanup utilities help manage test data

---

**Last Updated:** 2025-11-14
**Related Files:**
- `src/lib/rag/unified-rag-service.ts` (UUID generation)
- `src/lib/rag/gemini-file-search.ts` (store management, logging)
- `src/app/api/pdf-chat/process/route.ts` (upload logging)
- `src/app/api/pdf-chat/chat/route.ts` (chat logging)
- `scripts/cleanup-gemini-stores.ts` (cleanup utility)
