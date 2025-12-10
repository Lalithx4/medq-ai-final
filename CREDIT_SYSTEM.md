# Credit System Configuration

## Overview

The BioDocsAI credit system can be **enabled or disabled** globally using an environment variable. This allows you to:
- Run the app in **development mode** without credit restrictions
- Test features without worrying about credits
- Deploy in **production mode** with full credit management
- Offer **unlimited access** to specific users or deployments

---

## Configuration

### Environment Variable

Add this to your `.env` file:

```bash
# Enable/Disable Credit System
# Values: "true" (enabled) | "false" (disabled)
# Default: "true"
ENABLE_CREDIT_SYSTEM="true"
```

### Options

| Value | Behavior |
|-------|----------|
| `"true"` | ✅ **Enabled** - Full credit system active |
| `"false"` | ❌ **Disabled** - Unlimited credits for all users |
| `"1"` | ✅ **Enabled** - Alternative syntax |
| `"0"` | ❌ **Disabled** - Alternative syntax |
| `"yes"` | ✅ **Enabled** - Alternative syntax |
| `"no"` | ❌ **Disabled** - Alternative syntax |

---

## When Credit System is ENABLED (`true`)

### User Experience:
- ✅ Credits are **tracked and deducted** for operations
- ✅ Users see their **actual credit balance** (e.g., "80 Credits")
- ✅ Operations **require sufficient credits**
- ✅ Users are **blocked** if credits are insufficient
- ✅ Credit transactions are **logged** in database
- ✅ Users can **purchase credits** via pricing page

### API Behavior:
```typescript
// Credit checks are enforced
CreditService.hasEnoughCredits(userId, "research_paper")
// → Returns false if user has < 15 credits

// Credits are deducted
CreditService.deductCredits(userId, "research_paper", "Generated paper")
// → Deducts 15 credits from user balance

// Balance is tracked
CreditService.getBalance(userId)
// → Returns actual balance (e.g., 80)
```

---

## When Credit System is DISABLED (`false`)

### User Experience:
- ✅ **Unlimited credits** for all operations
- ✅ Users see **"Unlimited"** badge with ∞ icon
- ✅ **No restrictions** on any features
- ✅ **No credit checks** or deductions
- ✅ Pricing page still accessible (for future purchases)

### API Behavior:
```typescript
// Credit checks always pass
CreditService.hasEnoughCredits(userId, "research_paper")
// → Always returns true

// Credits are NOT deducted
CreditService.deductCredits(userId, "research_paper", "Generated paper")
// → Returns success without deducting

// Balance shows unlimited
CreditService.getBalance(userId)
// → Returns 999999 (unlimited indicator)
```

---

## Use Cases

### 1. Development Mode
```bash
# .env.local
ENABLE_CREDIT_SYSTEM="false"
```
**Why?** Test features without credit restrictions during development.

### 2. Production Mode
```bash
# .env.production
ENABLE_CREDIT_SYSTEM="true"
```
**Why?** Full credit management for paying customers.

### 3. Demo/Preview Deployment
```bash
# .env.preview
ENABLE_CREDIT_SYSTEM="false"
```
**Why?** Let users try all features without limits.

### 4. Enterprise Self-Hosted
```bash
# .env
ENABLE_CREDIT_SYSTEM="false"
```
**Why?** Enterprise customers get unlimited access.

---

## Visual Indicators

### Enabled (Normal Credits)
```
┌─────────────────────┐
│ 💰 80 Credits       │
│ Click to buy credits│
└─────────────────────┘
```

### Disabled (Unlimited)
```
┌─────────────────────┐
│ ∞ Unlimited         │
│ Credits disabled    │
└─────────────────────┘
```

---

## Implementation Details

### Files Modified:
1. **`/src/env.js`** - Added `ENABLE_CREDIT_SYSTEM` variable
2. **`/src/lib/credits/credit-config.ts`** - Toggle logic
3. **`/src/lib/credits/credit-service.ts`** - Respects toggle
4. **`/src/contexts/CreditsContext.tsx`** - Detects disabled state
5. **`/src/components/credits/CreditsDisplay.tsx`** - Shows unlimited badge
6. **`/env-template.txt`** - Documentation

### How It Works:
```typescript
// credit-config.ts
export function isCreditSystemEnabled(): boolean {
  const enabled = env.ENABLE_CREDIT_SYSTEM?.toLowerCase();
  return enabled !== "false" && enabled !== "0" && enabled !== "no";
}

// credit-service.ts
static async hasEnoughCredits(userId: string, operation: string) {
  if (!isCreditSystemEnabled()) {
    return true; // Always allow
  }
  // Normal credit check logic...
}
```

---

## Testing

### Test Enabled State:
1. Set `ENABLE_CREDIT_SYSTEM="true"`
2. Restart server
3. Check sidebar shows actual credits (e.g., "80 Credits")
4. Try operations - should deduct credits

### Test Disabled State:
1. Set `ENABLE_CREDIT_SYSTEM="false"`
2. Restart server
3. Check sidebar shows "∞ Unlimited"
4. Try operations - should work without deductions

---

## API Routes Affected

All these routes respect the `ENABLE_CREDIT_SYSTEM` toggle:

| Route | Operation | Credits |
|-------|-----------|---------|
| `/api/presentation/generate` | Presentation | 10 |
| `/api/research-paper/generate` | Research Paper | 15 |
| `/api/deep-research/generate` | Deep Research | 20 |
| `/api/editor/ai-assist` | AI Assistant | 2-5 |
| `/api/editor/quick-action` | Quick Actions | 2-5 |
| `/api/editor/paraphrase` | Paraphrase | 3 |
| `/api/editor/autocomplete` | Autocomplete | 1 |
| `/api/editor/search-citations` | Citations | 0 (free) |

---

## Database Impact

### When Enabled:
- ✅ Credit transactions are logged
- ✅ User balances are updated
- ✅ Full audit trail maintained

### When Disabled:
- ❌ No transactions logged
- ❌ No balance changes
- ✅ Database remains clean

---

## Migration Guide

### Enabling Credits (false → true):
1. Set `ENABLE_CREDIT_SYSTEM="true"`
2. Restart server
3. Users will see their actual balance
4. Credits will start being deducted

### Disabling Credits (true → false):
1. Set `ENABLE_CREDIT_SYSTEM="false"`
2. Restart server
3. Users will see "Unlimited"
4. No more deductions

**Note:** Existing credit balances are preserved in the database.

---

## Best Practices

### ✅ DO:
- Use `false` for development/testing
- Use `true` for production with paying customers
- Document the setting in your deployment docs
- Test both modes before deploying

### ❌ DON'T:
- Toggle frequently in production
- Forget to restart server after changing
- Mix modes across environments
- Hardcode the value in code

---

## Troubleshooting

### Issue: Credits still being deducted when disabled
**Solution:** Restart the server. Environment variables are loaded at startup.

### Issue: Shows "0 Credits" instead of "Unlimited"
**Solution:** Check that `ENABLE_CREDIT_SYSTEM="false"` (with quotes) in `.env`

### Issue: API returns 402 (insufficient credits)
**Solution:** Verify environment variable is set correctly and server restarted.

---

## Support

For questions or issues:
1. Check this documentation
2. Verify `.env` configuration
3. Check server logs for `[CreditService]` messages
4. Ensure server was restarted after changes

---

**Last Updated:** 2025-10-27
