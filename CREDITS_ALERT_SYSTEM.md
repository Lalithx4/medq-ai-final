# Credits Alert System Implementation

## Overview
Implemented a comprehensive credit checking and alert system to notify users when they have insufficient credits or when credits are running low.

## Features Implemented

### 1. **Insufficient Credits Modal** 
A beautiful, informative modal that appears when a user tries to use a feature without enough credits.

**Features:**
- Shows the feature name and required credits
- Displays current balance and shortfall
- Lists upgrade benefits
- Direct link to pricing page
- Professional UI with icons and color coding

**Location:** `/src/components/credits/InsufficientCreditsModal.tsx`

### 2. **Low Credits Warning Modal**
A warning modal that appears once per session when user has ≤20 credits remaining.

**Features:**
- Shows current credit balance
- Encourages upgrading before running out
- Only shows once per session (not annoying)
- Can be dismissed to continue working

**Location:** `/src/components/credits/InsufficientCreditsModal.tsx`

### 3. **useCreditsCheck Hook**
A reusable React hook that provides credit checking functionality to any component.

**Features:**
- `checkCredits(operation, operationName)` - Checks if user has enough credits
- `InsufficientCreditsDialog` - Renders the insufficient credits modal
- `LowCreditsDialog` - Renders the low credits warning
- `currentCredits` - Current user balance
- `refreshCredits()` - Manually refresh credit balance

**Location:** `/src/hooks/useCreditsCheck.tsx`

## Credit Costs

| Feature | Operation Key | Cost (Credits) |
|---------|--------------|----------------|
| **Presentations** | | |
| Generate Outline | `presentation_outline` | 5 |
| Generate Slides | `presentation_generate` | 10 |
| Edit Presentation | `presentation_edit` | 3 |
| **Research** | | |
| Research Paper | `research_paper` | 15 |
| Deep Research | `deep_research` | 20 |
| **Chat** | | |
| Chat Message | `chat_message` | 1 |
| **Editor** | | |
| Generate Content | `editor_generate` | 5 |
| Improve Text | `editor_improve` | 3 |
| Add Citations | `editor_citations` | 2 |
| **AI Writing** | | |
| AI Autocomplete | `ai_autocomplete` | 1 |
| Paraphrase Text | `ai_paraphrase` | 3 |
| Citation Search | `citation_search` | 0 (Free) |
| **Images** | | |
| Generate Image | `image_generate` | 5 |
| Unsplash Image | `image_unsplash` | 0 (Free) |

## Integration Points

### ✅ Implemented
1. **Presentation Dashboard** (`/src/components/presentation/dashboard/PresentationDashboard.tsx`)
   - Checks credits before generating presentations
   - Shows modal if insufficient credits
   - Shows low credits warning on page load

### 🔄 To Be Implemented
The following components need the same integration:

2. **Deep Research Dashboard** (`/src/components/deep-research/DeepResearchDashboard.tsx`)
   ```tsx
   import { useCreditsCheck } from "@/hooks/useCreditsCheck";
   
   const { checkCredits, InsufficientCreditsDialog, LowCreditsDialog } = useCreditsCheck();
   
   const handleStartResearch = async () => {
     const hasCredits = await checkCredits("deep_research", "Deep Research");
     if (!hasCredits) return;
     // ... proceed with research
   };
   ```

3. **Research Paper Form** (`/src/components/research-paper/ResearchPaperForm.tsx`)
   ```tsx
   const hasCredits = await checkCredits("research_paper", "Research Paper");
   if (!hasCredits) return;
   ```

4. **Editor Features** (Autocomplete, Paraphrase, etc.)
   - Check credits before each AI operation
   - Show modal immediately if insufficient

5. **Chat Interface**
   - Check credits before sending messages
   - Show warning when low on credits

## How to Integrate

### Step 1: Import the Hook
```tsx
import { useCreditsCheck } from "@/hooks/useCreditsCheck";
```

### Step 2: Use the Hook
```tsx
const { 
  checkCredits, 
  InsufficientCreditsDialog, 
  LowCreditsDialog 
} = useCreditsCheck();
```

### Step 3: Add Dialogs to JSX
```tsx
return (
  <>
    <InsufficientCreditsDialog />
    <LowCreditsDialog />
    {/* Your component content */}
  </>
);
```

### Step 4: Check Credits Before Operations
```tsx
const handleFeatureAction = async () => {
  // Check credits first
  const hasCredits = await checkCredits(
    "operation_key",  // e.g., "deep_research"
    "Feature Name"    // e.g., "Deep Research"
  );
  
  if (!hasCredits) {
    // Modal will show automatically
    return;
  }
  
  // Proceed with the operation
  // ...
};
```

## User Experience Flow

### Scenario 1: User Has Sufficient Credits
1. User clicks "Generate Presentation"
2. Credits check passes silently
3. Generation starts immediately
4. No interruption

### Scenario 2: User Has Low Credits (≤20)
1. User loads the page
2. Low credits warning modal appears (once per session)
3. User can dismiss or upgrade
4. If dismissed, they can continue using features

### Scenario 3: User Has Insufficient Credits
1. User clicks "Generate Presentation" (costs 10 credits, has 5)
2. Beautiful modal appears showing:
   - Feature name: "Generate Presentation"
   - Required: 10 credits
   - Current balance: 5 credits
   - Shortfall: 5 more credits needed
   - Upgrade benefits
3. User can:
   - Cancel and return
   - Click "View Pricing Plans" to upgrade

## Backend Integration

The backend already has credit checks in place:
- `/api/presentation/generate` - Checks credits before generation
- `/api/deep-research/langchain-stream` - Should check credits
- `/api/research-paper/academic-stream` - Should check credits
- `/api/editor/paraphrase` - Checks credits
- `/api/editor/autocomplete` - Checks credits

The frontend now provides a **better UX** by checking credits **before** making the API call, preventing unnecessary requests and providing immediate feedback.

## Testing

### Test Insufficient Credits
1. Temporarily modify your user's credits in the database to a low value (e.g., 5)
2. Try to generate a presentation (costs 10)
3. Modal should appear with correct information

### Test Low Credits Warning
1. Set credits to exactly 20
2. Refresh the page
3. Low credits warning should appear once

### Test Normal Flow
1. Set credits to 100+
2. All features should work normally
3. No modals should appear

## Files Created/Modified

### Created:
1. `/src/components/credits/InsufficientCreditsModal.tsx` - Modal components
2. `/src/hooks/useCreditsCheck.tsx` - Reusable hook
3. `/CREDITS_ALERT_SYSTEM.md` - This documentation

### Modified:
1. `/src/components/presentation/dashboard/PresentationDashboard.tsx` - Added credit checks
2. `/src/components/credits/CreditsDisplay.tsx` - Fixed credit fetching with fallback

## Next Steps

1. **Integrate into all features** (see "To Be Implemented" section above)
2. **Test thoroughly** with different credit amounts
3. **Monitor user feedback** on the modal UX
4. **Consider adding**:
   - Credit usage history in the modal
   - Estimated credits needed for current operation
   - "Buy credits" quick action (if you add credit purchasing)
   - Animation when modal appears

## Benefits

✅ **Better UX** - Users know immediately why a feature isn't working
✅ **Reduced API calls** - Check credits before making expensive requests
✅ **Increased conversions** - Clear path to upgrade when needed
✅ **Professional appearance** - Beautiful, informative modals
✅ **Reusable** - Easy to add to any feature with the hook
✅ **Non-intrusive** - Low credits warning only shows once per session

---

*Last Updated: 2025-10-27 11:19 IST*
