# Bug Fix: Slate DOM Node Resolution Error

## Issue
Runtime error: "Cannot resolve a DOM node from Slate node"

## Root Cause
The error occurred due to race conditions in how the Plate editor was being initialized and updated:

1. **Multiple setValue calls**: The editor was calling `setValue` multiple times during initialization
2. **Unstable initial value**: The editor was being recreated on every render because the `value` prop was not stable
3. **No change detection**: Content was being set even when it hadn't changed, causing unnecessary DOM updates

## Solution
Modified `src/components/presentation/editor/presentation-editor.tsx`:

### Changes Made:

1. **Stable Initial Value**: Used `useRef` to store the initial content value, preventing editor recreation
   ```typescript
   const initialValueRef = React.useRef(initialContent?.content ?? ({} as Value));
   ```

2. **Initialization Tracking**: Added a ref to track if the editor has been initialized
   ```typescript
   const initializedRef = React.useRef(false);
   ```

3. **Content Change Detection**: Added tracking to only update when content actually changes
   ```typescript
   const prevContentRef = React.useRef(initialContent?.content);
   ```

4. **Conditional Updates**: Only call `setValue` when:
   - First initialization (once)
   - During generation AND content has actually changed

## Benefits
- ✅ Eliminates race conditions between DOM rendering and Slate updates
- ✅ Prevents unnecessary re-renders and editor recreations
- ✅ Ensures DOM nodes are fully rendered before updates
- ✅ Improves performance by avoiding redundant setValue calls

## Testing
Test the following scenarios:
1. Create a new presentation
2. Edit existing slides
3. Generate new slides with AI
4. Switch between slides
5. Present mode
6. Undo/redo operations
