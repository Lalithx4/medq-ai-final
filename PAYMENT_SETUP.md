# Payment & Credit System Setup Guide

## 🎯 Overview

This application now has a complete credit and payment system with:
- **Credit-based usage** for all AI features
- **Multiple pricing plans** (Free, Basic, Pro, Enterprise)
- **Dual currency support** (USD via Stripe, INR via Razorpay)
- **Automatic credit deduction** when using AI features
- **Payment webhooks** for automatic credit top-up

---

## 📋 Prerequisites

1. **Stripe Account** (for USD payments)
   - Sign up at https://stripe.com
   - Get your API keys from Dashboard

2. **Razorpay Account** (for INR payments)
   - Sign up at https://razorpay.com
   - Get your API keys from Dashboard

---

## 🔧 Setup Instructions

### Step 1: Install Dependencies

The payment libraries should already be installed. If not, run:

```bash
pnpm add stripe razorpay
```

### Step 2: Configure Environment Variables

Add these to your `.env` file:

```env
# Stripe (for USD payments)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Razorpay (for INR payments)
RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_KEY_SECRET="..."
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_..."
RAZORPAY_WEBHOOK_SECRET="..."
```

### Step 3: Run Database Migration

```bash
pnpm db:push
```

This will add:
- `credits` field to User table
- `subscriptionPlan` and `subscriptionEnd` fields
- `CreditTransaction` table
- `Payment` table

### Step 4: Set Up Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://yourdomain.com/api/payment/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `checkout.session.expired`
4. Copy the webhook secret to `STRIPE_WEBHOOK_SECRET`

### Step 5: Set Up Razorpay Webhook (Optional)

1. Go to Razorpay Dashboard → Settings → Webhooks
2. Add webhook URL: `https://yourdomain.com/api/payment/razorpay/webhook`
3. Select events: `payment.captured`
4. Copy the webhook secret to `RAZORPAY_WEBHOOK_SECRET`

### Step 6: Test Payments

**Stripe Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

**Razorpay Test Cards:**
- Success: Any valid card number
- Use test mode in Razorpay dashboard

---

## 💳 How It Works

### Credit System

1. **New users** get 100 free credits
2. **Credits are deducted** automatically when using AI features:
   - Presentation generation: 10 credits
   - Research paper: 15 credits
   - Deep research: 20 credits
   - Chat message: 1 credit
   - Editor operations: 2-5 credits

3. **Low credit warning** appears when < 20 credits
4. **Upgrade prompt** shown when credits run out

### Payment Flow

**USD (Stripe):**
1. User selects plan on `/pricing`
2. Clicks "Upgrade Now"
3. Redirected to Stripe Checkout
4. After payment, webhook adds credits
5. User redirected to success page

**INR (Razorpay):**
1. User selects plan on `/pricing`
2. Clicks "Upgrade Now"
3. Razorpay modal opens
4. After payment, verification API adds credits
5. Success message shown

---

## 📊 Pricing Plans

| Plan       | Credits | USD    | INR    |
|------------|---------|--------|--------|
| Free       | 100     | $0     | ₹0     |
| Basic      | 1,000   | $9.99  | ₹799   |
| Pro        | 5,000   | $29.99 | ₹2,499 |
| Enterprise | 20,000  | $99.99 | ₹8,499 |

---

## 🔍 API Endpoints

### Credits
- `GET /api/credits/balance` - Get user's credit balance
- `GET /api/credits/history` - Get transaction history

### Payments
- `POST /api/payment/stripe/checkout` - Create Stripe checkout session
- `POST /api/payment/stripe/webhook` - Stripe webhook handler
- `POST /api/payment/razorpay/create-order` - Create Razorpay order
- `POST /api/payment/razorpay/verify` - Verify Razorpay payment

---

## 🎨 UI Components

### Credits Display
Shows in sidebar when expanded. Features:
- Current credit balance
- Color-coded (green = good, red = low)
- Upgrade button when low

### Pricing Page
- `/pricing` route
- Currency toggle (USD/INR)
- Plan comparison
- Direct payment integration

---

## 🚀 Going Live

### Production Checklist

1. ✅ Switch to production API keys (remove `_test_`)
2. ✅ Update webhook URLs to production domain
3. ✅ Test payment flow end-to-end
4. ✅ Set up monitoring for failed payments
5. ✅ Configure email notifications
6. ✅ Add terms & conditions
7. ✅ Add refund policy

### Security Notes

- Never commit API keys to git
- Use environment variables
- Verify webhook signatures
- Log all transactions
- Handle errors gracefully

---

## 🐛 Troubleshooting

**Credits not deducting:**
- Check if user is authenticated
- Verify credit cost in `plans.ts`
- Check console for errors

**Payment not completing:**
- Verify API keys are correct
- Check webhook is receiving events
- Look at Stripe/Razorpay dashboard logs

**Webhook not working:**
- Ensure URL is publicly accessible
- Verify webhook secret matches
- Check server logs

---

## 📞 Support

For issues or questions:
1. Check the logs in `/api/payment/*` routes
2. Review Stripe/Razorpay dashboard
3. Check database for payment records

---

## 🎉 You're All Set!

The credit and payment system is now fully functional. Users can:
- ✅ Get free credits on signup
- ✅ Use AI features with automatic credit deduction
- ✅ Purchase more credits via Stripe or Razorpay
- ✅ Track their usage history
- ✅ Upgrade/downgrade plans anytime

Happy coding! 🚀
