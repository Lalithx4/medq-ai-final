# Existing Structure Analysis - Payment & Subscription System

## 📊 Current Implementation Status

### ✅ **What EXISTS:**

#### **1. Database Schema (Prisma)**

**User Model:**
```prisma
- credits: Int (default 100)
- subscriptionPlan: String (default "free")
- subscriptionStart: DateTime? (NEW - added)
- subscriptionEnd: DateTime?
- lastCreditRefresh: DateTime? (NEW - added)
- stripeCustomerId: String? (unique)
```

**Payment Model:**
```prisma
- id: String (cuid)
- userId: String
- amount: Float
- currency: String (USD/INR)
- status: String (pending, completed, failed, refunded)
- plan: String
- creditsAdded: Int
- stripePaymentId: String? (unique)
- razorpayPaymentId: String? (unique)
- createdAt: DateTime
- updatedAt: DateTime
```

**CreditTransaction Model:**
```prisma
- id: String (cuid)
- userId: String
- amount: Int (positive for purchase, negative for usage)
- type: String (usage, purchase, bonus, refund)
- description: String
- operation: String? (presentation, research, chat, etc.)
- createdAt: DateTime
```

**TokenUsage Model:**
```prisma
- id: String (cuid)
- userId: String
- operation: String
- operationId: String?
- inputTokens: Int
- outputTokens: Int
- totalTokens: Int
- modelProvider: String
- modelId: String
- inputCost: Float
- outputCost: Float
- totalCost: Float
- metadata: Json?
- createdAt: DateTime
```

#### **2. Existing API Routes**

**Payment APIs:**
```
✅ /api/payment/stripe/checkout (POST) - Create Stripe checkout session
✅ /api/payment/stripe/webhook (POST) - Handle Stripe webhooks
✅ /api/payment/razorpay/create-order (POST) - Create Razorpay order
✅ /api/payment/razorpay/verify (POST) - Verify Razorpay payment
```

**Subscription APIs:**
```
✅ /api/subscription/status (GET) - Get user subscription details
✅ /api/cron/refresh-credits (GET/POST) - Daily credit refresh cron
```

**Credit APIs:**
```
❌ /api/credits/balance - NOT FOUND (but referenced in CreditsDisplay.tsx)
❌ /api/credits/history - MISSING
```

#### **3. Existing Services**

**Payment Services:**
```typescript
✅ StripeService (src/lib/payment/stripe-service.ts)
   - createCheckoutSession()
   - verifyWebhookSignature()
   - getSession()

✅ RazorpayService (src/lib/payment/razorpay-service.ts)
   - createOrder()
   - verifyPaymentSignature()
   - getPayment()
```

**Credit Service:**
```typescript
✅ CreditService (src/lib/credits/credit-service.ts)
   - hasEnoughCredits()
   - deductCredits()
   - addCredits()
   - getBalance()
   - getTransactionHistory()
```

**Subscription Service:**
```typescript
✅ SubscriptionService (src/lib/subscription/subscription-service.ts)
   - createSubscription()
   - refreshCreditsForDueUsers()
   - isSubscriptionActive()
   - cancelSubscription()
   - getSubscriptionDetails()
```

#### **4. Existing UI Components**

**Credits:**
```
✅ CreditsDisplay.tsx - Shows current credit balance
✅ CreditUsageToast.tsx - Toast notifications for credit usage
```

**Subscription:**
```
✅ SubscriptionStatus.tsx - Shows subscription details
```

**Pages:**
```
✅ /pricing - Pricing plans page with payment integration
✅ /payment/success - Payment success page
❌ /settings - MISSING
```

#### **5. Existing Pricing Plans**

```typescript
Free: 100 credits, $0
Basic: 1000 credits/month, $9.99 USD / ₹799 INR
Pro: 5000 credits/month, $29.99 USD / ₹2499 INR
(Enterprise removed)
```

---

## ❌ **What's MISSING for Settings Page:**

### **1. Backend APIs Needed:**

```
❌ GET /api/user/profile - Get user profile details
❌ PUT /api/user/profile - Update user profile
❌ GET /api/credits/balance - Get credit balance
❌ GET /api/credits/history - Get credit transaction history
❌ GET /api/payment/history - Get payment history
❌ GET /api/subscription/details - Enhanced subscription details
❌ POST /api/subscription/cancel - Cancel subscription
❌ POST /api/subscription/upgrade - Upgrade plan
❌ GET /api/billing/invoices - Get billing invoices (if needed)
```

### **2. Frontend Components Needed:**

```
❌ Settings Page Layout (with tabs)
❌ Profile Settings Tab
❌ Subscription Management Tab
❌ Payment Methods Tab (if storing cards)
❌ Billing History Tab
❌ Usage Statistics Tab
❌ Cancel Subscription Modal
❌ Upgrade Plan Modal
```

### **3. Features to Implement:**

**Profile Management:**
- View/edit name, email
- View account creation date
- View account role

**Subscription Management:**
- Current plan display
- Credits remaining
- Next billing date
- Days until credit refresh
- Upgrade/downgrade plan
- Cancel subscription

**Payment History:**
- List all payments
- Filter by status (completed, pending, failed)
- Show payment method (Stripe/Razorpay)
- Download receipts (optional)

**Credit History:**
- List all credit transactions
- Filter by type (purchase, usage, bonus, refund)
- Show operation details
- Export to CSV (optional)

**Billing Details:**
- Current plan cost
- Next billing amount
- Payment method on file (if any)
- Billing address (if needed)

**Usage Statistics:**
- Token usage over time
- Credits used per operation
- Most used features
- Cost breakdown

---

## 🏗️ **Recommended Structure:**

### **Directory Structure:**

```
src/
├── app/
│   ├── settings/
│   │   └── page.tsx (Main settings page)
│   └── api/
│       ├── user/
│       │   └── profile/
│       │       └── route.ts
│       ├── credits/
│       │   ├── balance/
│       │   │   └── route.ts
│       │   └── history/
│       │       └── route.ts
│       ├── payment/
│       │   └── history/
│       │       └── route.ts
│       └── subscription/
│           ├── cancel/
│           │   └── route.ts
│           └── upgrade/
│               └── route.ts
│
├── components/
│   └── settings/
│       ├── SettingsLayout.tsx
│       ├── ProfileTab.tsx
│       ├── SubscriptionTab.tsx
│       ├── PaymentHistoryTab.tsx
│       ├── CreditHistoryTab.tsx
│       ├── BillingTab.tsx
│       ├── UsageTab.tsx
│       ├── CancelSubscriptionModal.tsx
│       └── UpgradePlanModal.tsx
│
└── lib/
    └── user/
        └── user-service.ts (if needed)
```

---

## 📋 **Implementation Priority:**

### **Phase 1: Core Settings (High Priority)**
1. ✅ Settings page layout with tabs
2. ✅ Profile tab (view/edit basic info)
3. ✅ Subscription tab (current plan, cancel, upgrade)
4. ✅ Payment history tab
5. ✅ Credit history tab

### **Phase 2: Enhanced Features (Medium Priority)**
6. ⏳ Usage statistics tab
7. ⏳ Billing details tab
8. ⏳ Download receipts
9. ⏳ Export credit history

### **Phase 3: Advanced Features (Low Priority)**
10. ⏳ Payment method management (save cards)
11. ⏳ Billing address management
12. ⏳ Email preferences
13. ⏳ Notification settings

---

## 🎯 **Key Decisions to Make:**

### **1. Payment Method Storage:**
- **Option A:** Don't store cards (redirect to Stripe/Razorpay each time)
- **Option B:** Store cards via Stripe Customer Portal
- **Recommendation:** Option A (simpler, more secure)

### **2. Subscription Cancellation:**
- **Option A:** Immediate cancellation (lose access right away)
- **Option B:** Cancel at end of billing period (keep access until expiry)
- **Recommendation:** Option B (better UX)

### **3. Plan Changes:**
- **Option A:** Immediate upgrade/downgrade
- **Option B:** Change takes effect next billing cycle
- **Recommendation:** Option A for upgrades, Option B for downgrades

### **4. Invoices/Receipts:**
- **Option A:** Generate PDF invoices
- **Option B:** Link to Stripe/Razorpay receipts
- **Recommendation:** Option B (simpler)

---

## ✅ **Summary:**

**Existing (Strong Foundation):**
- ✅ Complete database schema
- ✅ Payment integration (Stripe + Razorpay)
- ✅ Credit system with transactions
- ✅ Subscription service
- ✅ Basic UI components

**Missing (Need to Build):**
- ❌ Settings page UI
- ❌ Additional API endpoints
- ❌ Payment/credit history views
- ❌ Subscription management UI
- ❌ Cancel/upgrade functionality

**Estimated Implementation Time:**
- Phase 1 (Core): 3-4 hours
- Phase 2 (Enhanced): 2-3 hours
- Phase 3 (Advanced): 3-4 hours
- **Total: 8-11 hours for complete implementation**

---

## 🚀 **Next Steps:**

1. Create settings page layout
2. Implement missing API endpoints
3. Build tab components
4. Add cancel/upgrade modals
5. Test payment flows
6. Add error handling
7. Polish UI/UX

**Ready to implement Phase 1?** 🎯
