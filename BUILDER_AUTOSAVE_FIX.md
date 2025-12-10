# Builder Autosave Fix

## Issue
Generated content in IRB Builder, Personal Statement Builder, and E-Poster Builder was not being saved automatically after generation.

## Root Cause
All three builders had the same bug in their autosave implementation:

```typescript
// BEFORE (broken)
const handleGenerate = async () => {
  // ... fetch and get data
  const nextMarkdown = data.markdown;
  setMarkdown(nextMarkdown);  // React state update (async)
  void saveDraft();            // Called immediately, uses OLD markdown value
};
```

**Problem**: React state updates are asynchronous. When `saveDraft()` was called immediately after `setMarkdown()`, it was still using the **old/empty** markdown value from the previous render, not the newly generated content.

## Solution
Pass the generated content directly to the save function instead of relying on state:

```typescript
// AFTER (fixed)
const handleGenerate = async () => {
  // ... fetch and get data
  const nextMarkdown = data.markdown;
  setMarkdown(nextMarkdown);
  void saveDraft(nextMarkdown);  // Pass the new content directly
};

const saveDraft = async (markdownToSave?: string) => {
  const contentToSave = markdownToSave ?? markdown;  // Use parameter if provided
  // ... save contentToSave
};
```

## Files Changed

### 1. IRB Builder
**File:** `src/components/irb/IrbBuilderDashboard.tsx`

**Changes:**
- Modified `saveDraft` to accept optional `markdownToSave` parameter
- Updated `handleGenerate` to pass `nextMarkdown` directly to `saveDraft(nextMarkdown)`

### 2. Personal Statement Builder
**File:** `src/components/personal-statement/PersonalStatementDashboard.tsx`

**Changes:**
- Modified `saveStatement` to accept optional `markdownToSave` parameter
- Updated `handleGenerate` to pass `nextMarkdown` directly to `saveStatement(nextMarkdown)`

### 3. E-Poster Builder
**File:** `src/components/poster/PosterBuilderDashboard.tsx`

**Changes:**
- Modified `savePoster` to accept optional `sectionsToSave` parameter
- Updated `handleGenerate` to create `newSections` object and pass it directly to `savePoster(newSections)`

## Testing

To verify the fix works:

1. **IRB Builder** (`/irb-builder`):
   - Fill in study title and basic info
   - Click "Generate IRB protocol"
   - Check that draft appears in "Recent drafts" dropdown
   - Reload page and verify draft is still there

2. **Personal Statement Builder** (`/personal-statement`):
   - Fill in specialty and basic info
   - Click "Generate statement"
   - Check that statement appears in "Saved statements" dropdown
   - Reload page and verify statement is still there

3. **E-Poster Builder** (`/poster-builder`):
   - Fill in title and abstract
   - Click "Generate poster"
   - Check that poster appears in "Saved posters" dropdown
   - Reload page and verify poster is still there

## Impact

- ✅ Generated content is now automatically saved after generation
- ✅ Users won't lose their work if they navigate away or refresh
- ✅ "Recent drafts" / "Saved" dropdowns now populate correctly
- ✅ Manual save button still works as expected
- ✅ No breaking changes to existing functionality

## Related Functionality

The fix ensures that:
- Autosave triggers correctly after AI generation
- The `isDirty` flag is properly reset after autosave
- `lastSavedAt` timestamp is updated correctly
- The saved items list is updated in the UI
- Document IDs are tracked for subsequent saves
