# 🔒 PDF Chat - User Isolation Issue & Fix

## ⚠️ Current Problem

The FastAPI backend has a **critical security issue** with user data isolation:

### Issue:
```python
# In medicalrag_fastapi.py line 118
self.current_user_id = "default_user"  # ❌ HARDCODED!
```

**Impact:**
- All users' embeddings are stored with `user_id = "default_user"`
- Users can potentially access each other's documents
- No proper user isolation in the database

---

## ✅ How It Should Work

### Correct Flow:
```
1. User uploads PDF in Next.js
2. Next.js authenticates user → Gets user.id from Supabase Auth
3. Next.js calls FastAPI with user_id in request
4. FastAPI stores embeddings with THAT user_id
5. Database RLS policies enforce user isolation
```

### Current Flow (WRONG):
```
1. User uploads PDF in Next.js
2. Next.js gets user.id ✓
3. Next.js sends user_id to FastAPI ✓
4. FastAPI IGNORES user_id and uses "default_user" ❌
5. All data goes to same user ❌
```

---

## 🔧 The Fix

### Option 1: Pass user_id per request (RECOMMENDED)

**Modify `process_document_from_supabase` method:**

```python
# Current (WRONG):
def process_document_from_supabase(self, document_id: str, file_content: bytes, 
                                   filename: str, user_id: str):
    # user_id parameter is IGNORED!
    # Uses self.current_user_id = "default_user" instead
    ...

# Fixed (CORRECT):
def process_document_from_supabase(self, document_id: str, file_content: bytes, 
                                   filename: str, user_id: str):
    # Store chunks with the ACTUAL user_id
    chunk_data = {
        'document_id': document_id,
        'user_id': user_id,  # ✓ Use the passed user_id
        'chunk_text': chunk_text,
        ...
    }
```

### Option 2: Set user context per request

**Add method to set user context:**

```python
def set_user_context(self, user_id: str):
    """Set the current user context for this request"""
    self.current_user_id = user_id

# In main.py before processing:
rag_system.set_user_context(request.user_id)
result = rag_system.process_document_from_supabase(...)
```

---

## 📝 Required Changes

### 1. Update `medicalrag_fastapi.py`

**Change chunk storage to include user_id:**

```python
# Around line 519-527
chunk_data = {
    'document_id': document_id,
    'user_id': user_id,  # ✓ ADD THIS
    'chunk_idx': len(all_chunks),
    'chunk_text': chunk_text,
    'page_number': page_num,
    'token_count': len(chunk_text.split()),
    'embedding': embedding,
    'metadata': {}
}
```

**Change entity storage to include user_id:**

```python
# Around line 603
entity_data = {
    'document_id': document_id,
    'user_id': user_id,  # ✓ ADD THIS
    'entity_name': entity['name'],
    'entity_type': entity['type'],
    ...
}
```

### 2. Update Database Schema

**Add user_id to medical_chunks table:**

```sql
ALTER TABLE medical_chunks 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add index
CREATE INDEX medical_chunks_user_id_idx ON medical_chunks(user_id);

-- Update RLS policy
CREATE POLICY "Users can only see their own chunks"
ON medical_chunks FOR SELECT
USING (user_id = auth.uid());
```

**Add user_id to medical_entities table:**

```sql
ALTER TABLE medical_entities 
ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Add index
CREATE INDEX medical_entities_user_id_idx ON medical_entities(user_id);

-- Update RLS policy
CREATE POLICY "Users can only see their own entities"
ON medical_entities FOR SELECT
USING (user_id = auth.uid());
```

### 3. Update Hybrid Search Function

**Modify to filter by user_id:**

```sql
CREATE OR REPLACE FUNCTION hybrid_search(
    query_embedding vector(768),
    query_text TEXT,
    doc_id UUID,
    user_id_param UUID,  -- ✓ ADD THIS
    match_threshold FLOAT DEFAULT 0.5,
    match_count INT DEFAULT 5,
    semantic_weight FLOAT DEFAULT 0.7
)
RETURNS TABLE (...) AS $$
BEGIN
    RETURN QUERY
    WITH semantic_search AS (
        SELECT ...
        FROM medical_chunks mc
        WHERE mc.document_id = doc_id
        AND mc.user_id = user_id_param  -- ✓ ADD THIS
        ...
    )
    ...
END;
$$ LANGUAGE plpgsql;
```

---

## 🧪 Testing User Isolation

### Test 1: Create documents as different users

```python
# User A uploads document
user_a_doc = process_document(..., user_id="user-a-uuid")

# User B uploads document  
user_b_doc = process_document(..., user_id="user-b-uuid")

# Verify chunks are isolated
chunks_a = supabase.table('medical_chunks').select('*').eq('user_id', 'user-a-uuid').execute()
chunks_b = supabase.table('medical_chunks').select('*').eq('user_id', 'user-b-uuid').execute()

# Should be separate
assert chunks_a.data != chunks_b.data
```

### Test 2: Query with user context

```python
# User A queries their document
results_a = hybrid_search(..., user_id="user-a-uuid")

# User B queries their document
results_b = hybrid_search(..., user_id="user-b-uuid")

# User A should NOT see User B's chunks
assert all(chunk['user_id'] == "user-a-uuid" for chunk in results_a)
assert all(chunk['user_id'] == "user-b-uuid" for chunk in results_b)
```

---

## 🚨 Security Implications

### Without Fix:
- ❌ User A can see User B's documents
- ❌ User A can query User B's data
- ❌ No data privacy
- ❌ Violates GDPR/privacy laws

### With Fix:
- ✅ Each user only sees their own data
- ✅ Database RLS enforces isolation
- ✅ Proper multi-tenancy
- ✅ Compliant with privacy regulations

---

## 📋 Implementation Checklist

- [ ] Update `process_document_from_supabase` to use passed `user_id`
- [ ] Update chunk storage to include `user_id`
- [ ] Update entity storage to include `user_id`
- [ ] Add `user_id` column to `medical_chunks` table
- [ ] Add `user_id` column to `medical_entities` table
- [ ] Update RLS policies to filter by `user_id`
- [ ] Update `hybrid_search` function to accept `user_id`
- [ ] Test with multiple users
- [ ] Verify data isolation works

---

## 🎯 Priority

**CRITICAL** - This should be fixed before production deployment.

**Workaround for now:**
- Single user testing is fine
- Don't deploy to production until fixed
- Keep API key authentication (already implemented)

---

## 📝 Summary

**Current State:**
- ✅ Next.js properly authenticates users
- ✅ Next.js sends user_id to FastAPI
- ❌ FastAPI ignores user_id and uses "default_user"
- ❌ No user isolation in database

**After Fix:**
- ✅ Next.js authenticates users
- ✅ Next.js sends user_id to FastAPI
- ✅ FastAPI uses the actual user_id
- ✅ Database enforces user isolation with RLS

**Action Required:**
Implement the changes in sections 1, 2, and 3 above before production deployment.
