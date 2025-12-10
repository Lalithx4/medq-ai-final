# Monthly Credit Refresh System - Setup Guide

## Overview
This system automatically refreshes credits for paid subscribers every 30 days.

## Database Migration

Run the migration to add new fields:

```bash
# Apply the Prisma schema changes
npx prisma migrate dev --name add_subscription_fields

# Or apply the SQL directly
psql $DATABASE_URL < migrations/add_subscription_fields.sql

# Generate Prisma client
npx prisma generate
```

## Environment Variables

Add to your `.env` file:

```env
# Cron job secret (generate a random string)
CRON_SECRET=your-random-secret-key-here
```

## Cron Job Setup

### Option 1: Vercel Cron Jobs (Recommended for Vercel deployments)

The `vercel.json` file is already configured. Vercel will automatically call the endpoint daily at midnight UTC.

**Setup:**
1. Deploy to Vercel
2. Go to Project Settings → Environment Variables
3. Add `CRON_SECRET` with a secure random value
4. Redeploy

### Option 2: External Cron Service (For other platforms)

Use a service like cron-job.org, EasyCron, or your server's crontab:

**Endpoint:** `https://yourdomain.com/api/cron/refresh-credits`
**Method:** GET or POST
**Headers:** `Authorization: Bearer YOUR_CRON_SECRET`
**Schedule:** Daily at midnight (0 0 * * *)

**Example cURL:**
```bash
curl -X GET https://yourdomain.com/api/cron/refresh-credits \
  -H "Authorization: Bearer your-cron-secret"
```

## How It Works

### 1. User Purchases Plan
- User pays via Stripe or Razorpay
- `SubscriptionService.createSubscription()` is called
- Sets:
  - `subscriptionStart`: Current date
  - `subscriptionEnd`: 30 days from now
  - `lastCreditRefresh`: Current date
  - `credits`: Plan's credit amount

### 2. Daily Cron Job
- Runs at midnight UTC
- Finds users where:
  - `subscriptionEnd` is in the future (active subscription)
  - `lastCreditRefresh` is null OR more than 30 days ago
- For each user:
  - Resets credits to plan amount
  - Updates `lastCreditRefresh` to current date
  - Creates transaction record

### 3. Credit Refresh Logic
```typescript
// User with Basic plan (1000 credits/month)
// Day 1: Purchase → 1000 credits
// Day 15: Used 500 → 500 remaining
// Day 31: Auto-refresh → 1000 credits (reset, not added)
```

## Testing

### Manual Trigger
```bash
# Test the cron endpoint
curl -X POST http://localhost:3000/api/cron/refresh-credits \
  -H "Authorization: Bearer your-cron-secret"
```

### Check Logs
```bash
# Watch for these log messages:
# "🔄 Found X users needing credit refresh"
# "✅ Refreshed X credits for user Y"
# "✅ Credit refresh complete: X refreshed, Y errors"
```

## Monitoring

### Check Subscription Status
```typescript
const details = await SubscriptionService.getSubscriptionDetails(userId);
console.log(details);
// {
//   subscriptionPlan: "pro",
//   subscriptionStart: "2025-01-01T00:00:00.000Z",
//   subscriptionEnd: "2025-02-01T00:00:00.000Z",
//   lastCreditRefresh: "2025-01-01T00:00:00.000Z",
//   credits: 5000,
//   planDetails: { ... },
//   isActive: true
// }
```

### Database Queries
```sql
-- Check users due for refresh
SELECT id, email, "subscriptionPlan", "lastCreditRefresh", "subscriptionEnd", credits
FROM "User"
WHERE "subscriptionPlan" != 'free'
  AND "subscriptionEnd" > NOW()
  AND ("lastCreditRefresh" IS NULL OR "lastCreditRefresh" < NOW() - INTERVAL '30 days');

-- Check recent credit transactions
SELECT * FROM "CreditTransaction"
WHERE operation = 'subscription_refresh'
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Important Notes

1. **Credits are RESET, not ADDED**
   - User with 500 remaining → Gets reset to plan amount (e.g., 1000)
   - Not cumulative

2. **30-Day Cycle**
   - Based on `lastCreditRefresh`, not calendar month
   - Flexible for mid-month purchases

3. **Free Plan**
   - No auto-refresh
   - One-time 100 credits on signup

4. **Subscription Expiry**
   - Currently set to 30 days
   - For true recurring billing, integrate Stripe/Razorpay subscriptions
   - This system assumes manual renewal

## Future Enhancements

1. **Stripe Subscriptions**
   - Use Stripe's recurring billing
   - Webhook for `invoice.paid` event
   - Automatic renewal

2. **Razorpay Subscriptions**
   - Use Razorpay's subscription API
   - Webhook for payment success
   - Automatic renewal

3. **Email Notifications**
   - Send email when credits refresh
   - Warn before subscription expires
   - Remind to renew

4. **Grace Period**
   - Allow 3-day grace period after expiry
   - Reduce credits but don't block access

## Troubleshooting

### Cron not running?
- Check Vercel logs
- Verify `CRON_SECRET` is set
- Test endpoint manually

### Credits not refreshing?
- Check `lastCreditRefresh` date in database
- Verify `subscriptionEnd` is in future
- Check cron job logs

### TypeScript errors?
- Run `npx prisma generate` after schema changes
- Restart TypeScript server

## Support

For issues or questions, check:
- Vercel Cron Jobs docs: https://vercel.com/docs/cron-jobs
- Prisma migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
