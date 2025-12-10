# 💰 Credits System - Quick Guide

## Where to Find Things

### 1. **View Your Credits**
- **Sidebar**: Expand the sidebar (left side) to see your credit balance
- **Click on Credits**: Click the credits display to go to pricing page

### 2. **Pricing Page**
- **URL**: Go to `http://localhost:3000/pricing`
- **Sidebar**: Click "Pricing & Credits" in the navigation menu
- **From Credits Display**: Click on your credits balance

### 3. **How Many Credits You Lose**

#### **Credit Costs Per Operation:**

| Operation | Credits Used | Description |
|-----------|--------------|-------------|
| **Presentation Generation** | 10 | Creating a full presentation |
| **Presentation Outline** | 5 | Generating outline only |
| **Research Paper** | 15 | Full academic paper |
| **Deep Research** | 20 | Comprehensive research report |
| **Chat Message** | 1 | Each AI chat message |
| **Editor - Generate** | 5 | Generate new content |
| **Editor - Improve** | 3 | Improve existing text |
| **Editor - Citations** | 2 | Add citations |
| **Image Generation (AI)** | 5 | Generate AI images |
| **Unsplash Images** | 0 | Free stock images |

### 4. **Track Your Usage**

#### **Real-Time Notifications:**
- After each operation, you'll see a toast notification showing:
  - ✅ Credits used
  - 📊 Remaining balance
  - ⚠️ Low credit warnings

#### **View History:**
- API endpoint: `GET /api/credits/history`
- Shows all your credit transactions
- Includes purchases and usage

### 5. **Current Credit Balance**

Your credits show **0** because:
1. You haven't run the database migration yet
2. New users should get 100 free credits automatically

**To fix this:**
```bash
# Run database migration
pnpm db:push

# This will add the credits field to your user account
# New users will automatically get 100 credits
```

### 6. **What Happens When You Run Out?**

When credits = 0:
- ❌ AI features will be blocked
- 🔔 You'll see "Insufficient credits" error
- 💳 Upgrade button will appear
- 📧 Redirect to pricing page

### 7. **How to Get More Credits**

#### **Option 1: Purchase a Plan**
1. Go to `/pricing`
2. Choose USD or INR currency
3. Select a plan:
   - **Basic**: 1,000 credits - $9.99 / ₹799
   - **Pro**: 5,000 credits - $29.99 / ₹2,499
   - **Enterprise**: 20,000 credits - $99.99 / ₹8,499
4. Complete payment via Stripe (USD) or Razorpay (INR)

#### **Option 2: Free Credits**
- New users get 100 free credits on signup
- Promotional bonuses (admin can add)

### 8. **Example Usage Scenarios**

**Scenario 1: Create 5 Presentations**
- Cost: 5 × 10 = 50 credits
- Recommended plan: Free (100 credits) ✅

**Scenario 2: Generate 10 Research Papers**
- Cost: 10 × 15 = 150 credits
- Recommended plan: Basic (1,000 credits) ✅

**Scenario 3: Heavy Usage (100 presentations + 50 papers)**
- Cost: (100 × 10) + (50 × 15) = 1,750 credits
- Recommended plan: Pro (5,000 credits) ✅

### 9. **Monitoring Your Usage**

#### **In the UI:**
- Sidebar shows current balance
- Color coding:
  - 🟢 Green: > 20 credits (good)
  - 🟡 Yellow: < 20 credits (low)
  - 🔴 Red: 0 credits (out)

#### **In the Database:**
Check `CreditTransaction` table for:
- All usage history
- Purchase records
- Timestamps
- Operation types

### 10. **Admin: Manually Add Credits**

If you need to add credits manually (for testing):

```sql
-- Add 1000 credits to a user
UPDATE "User" 
SET credits = credits + 1000 
WHERE email = 'user@example.com';

-- Create transaction record
INSERT INTO "CreditTransaction" (id, userId, amount, type, description, createdAt)
VALUES (
  gen_random_uuid(),
  'user_id_here',
  1000,
  'bonus',
  'Manual credit addition',
  NOW()
);
```

### 11. **Testing the System**

1. **Check Balance:**
   ```
   GET http://localhost:3000/api/credits/balance
   ```

2. **View History:**
   ```
   GET http://localhost:3000/api/credits/history
   ```

3. **Test Generation:**
   - Try creating a presentation
   - Watch console for credit deduction logs
   - Check remaining balance

### 12. **Troubleshooting**

**Problem: Credits showing 0**
- Solution: Run `pnpm db:push` to migrate database

**Problem: Can't see credit balance**
- Solution: Expand sidebar, credits show when sidebar is open

**Problem: Credits not deducting**
- Solution: Check server logs, ensure CreditService is working

**Problem: Payment not adding credits**
- Solution: Check webhook configuration in Stripe/Razorpay

---

## 🎯 Quick Actions

- **View Pricing**: http://localhost:3000/pricing
- **Check Balance**: Sidebar → Credits Display
- **Buy Credits**: Click credits → Choose plan → Pay
- **View History**: Call `/api/credits/history`

---

## 📞 Need Help?

1. Check server console for credit deduction logs
2. Review `PAYMENT_SETUP.md` for payment integration
3. Check database `CreditTransaction` table for history

---

**Remember:** Credits reset monthly for subscription plans! 🔄
