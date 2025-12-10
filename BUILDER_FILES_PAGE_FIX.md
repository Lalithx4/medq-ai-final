# Builder Files Page Integration Fix

## Issue
When IRB, Personal Statement, and E-Poster files were opened from the Files page, they were being loaded into the generic document editor which displayed the raw JSON content instead of properly formatted content in their respective builders.

## Root Cause
1. The Files page was routing all file types to `/editor?fileId=${file.id}`
2. The generic editor doesn't understand the JSON structure of builder files (which contain form state + markdown/sections)
3. The builders didn't support loading files via URL parameters

## Solution

### 1. Updated Files Dashboard Routing
**File:** `src/components/files/FilesDashboard.tsx`

**Changes:**
- Added builder file types to the `SavedFile` interface: `"irb-draft"`, `"poster"`, `"personal-statement"`
- Added labels for these types in `getTypeLabel()` function
- Created `getViewLink()` function to route to the correct builder based on file type:
  ```typescript
  const getViewLink = (file: SavedFile) => {
    switch (file.type) {
      case "irb-draft":
        return `/irb-builder?fileId=${file.id}`;
      case "poster":
        return `/poster-builder?fileId=${file.id}`;
      case "personal-statement":
        return `/personal-statement?fileId=${file.id}`;
      default:
        return `/editor?fileId=${file.id}`;
    }
  };
  ```
- Updated the View button to use `getViewLink(file)` instead of hardcoded `/editor` path

### 2. Added URL Parameter Support to Builders

All three builders now support loading files via `?fileId=` URL parameter.

#### IRB Builder
**File:** `src/components/irb/IrbBuilderDashboard.tsx`

**Changes:**
- Added `useSearchParams` import from `next/navigation`
- Added `searchParams` hook
- Added effect to load file from URL parameter:
  ```typescript
  useEffect(() => {
    const fileId = searchParams?.get("fileId");
    if (fileId) {
      void loadDraftById(fileId);
    }
  }, [searchParams]);
  ```

#### Personal Statement Builder
**File:** `src/components/personal-statement/PersonalStatementDashboard.tsx`

**Changes:**
- Added `useSearchParams` import
- Added `searchParams` hook
- Added effect to load file from URL parameter:
  ```typescript
  useEffect(() => {
    const fileId = searchParams?.get("fileId");
    if (fileId) {
      void loadStatementById(fileId);
    }
  }, [searchParams]);
  ```

#### E-Poster Builder
**File:** `src/components/poster/PosterBuilderDashboard.tsx`

**Changes:**
- Added `useSearchParams` import
- Added `searchParams` hook
- Added effect to load file from URL parameter:
  ```typescript
  useEffect(() => {
    const fileId = searchParams?.get("fileId");
    if (fileId) {
      void loadPosterById(fileId);
    }
  }, [searchParams]);
  ```

## Flow

### Before (Broken)
1. User clicks "View" on IRB/Poster/Personal Statement file in Files page
2. File opens in `/editor?fileId=123`
3. Generic editor loads raw JSON content
4. User sees unformatted JSON string

### After (Fixed)
1. User clicks "View" on IRB file in Files page
2. `getViewLink()` returns `/irb-builder?fileId=123`
3. IRB Builder loads
4. `useEffect` detects `fileId` parameter
5. Calls `loadDraftById(fileId)` to load the file
6. Form state and markdown are properly restored
7. User sees formatted IRB protocol with proper preview

## File Type Labels

The Files page now displays proper labels for builder files:
- `"irb-draft"` → "IRB Protocol"
- `"poster"` → "E-Poster"
- `"personal-statement"` → "Personal Statement"
- `"research-paper"` → "Research Paper"
- `"deep-research"` → "Deep Research"
- `"presentation"` → "Presentation"
- `"document"` → "Document"

## Testing

To verify the fix:

1. **Create and save files:**
   - Generate an IRB protocol and save it
   - Generate a personal statement and save it
   - Generate a poster and save it

2. **Navigate to Files page** (`/files`)

3. **Click "View" on each file type:**
   - IRB files should open in `/irb-builder` with proper formatting
   - Personal Statement files should open in `/personal-statement` with proper formatting
   - Poster files should open in `/poster-builder` with proper formatting

4. **Verify content:**
   - Form fields should be populated
   - Preview should show formatted content (not raw JSON)
   - All sections/figures/tables should be restored

## Benefits

✅ Builder files now open in their respective builders  
✅ Content is properly formatted and editable  
✅ No more raw JSON display  
✅ Seamless workflow from Files page to builders  
✅ Users can continue editing saved work  
✅ Consistent experience across all builder types
