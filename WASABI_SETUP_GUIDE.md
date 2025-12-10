# Wasabi Storage Setup Guide

## Overview
BioDocs AI uses **Wasabi S3-compatible storage** to store user files. Each user gets their own folder structure in the bucket.

## File Storage Structure
```
{bucket-name}/
└── users/
    └── {userId}/
        └── files/
            └── {year}/
                └── {month}/
                    └── {uniqueId}_{filename}
```

Example: `dataextract/users/abc123/files/2024/12/f8e9a1b2_report.pdf`

---

## Setup Steps

### 1. Wasabi Account Setup

1. Go to [Wasabi Console](https://console.wasabisys.com)
2. Create a bucket (e.g., `dataextract`)
3. Create Access Keys:
   - Go to **Access Keys** → **Create New Access Key**
   - Save the Access Key ID and Secret Access Key

### 2. Environment Variables

Add these to your `.env` file:

```env
# Wasabi S3-Compatible Storage
WASABI_ACCESS_KEY_ID=your_access_key_id
WASABI_SECRET_ACCESS_KEY=your_secret_access_key
WASABI_BUCKET_NAME=your_bucket_name
WASABI_REGION=ap-northeast-2
WASABI_ENDPOINT=https://s3.ap-northeast-2.wasabisys.com
```

**Available Wasabi Regions:**
| Region | Endpoint |
|--------|----------|
| US East 1 | `https://s3.us-east-1.wasabisys.com` |
| US East 2 | `https://s3.us-east-2.wasabisys.com` |
| US West 1 | `https://s3.us-west-1.wasabisys.com` |
| EU Central 1 | `https://s3.eu-central-1.wasabisys.com` |
| AP Northeast 1 (Tokyo) | `https://s3.ap-northeast-1.wasabisys.com` |
| AP Northeast 2 (Osaka) | `https://s3.ap-northeast-2.wasabisys.com` |
| AP South 1 (Mumbai) | `https://s3.ap-south-1.wasabisys.com` |

### 3. Database Setup

Run the SQL schema in Supabase Dashboard → SQL Editor:

```bash
# The schema file is located at:
database/file-manager-schema.sql
```

Or run this migration for existing databases:
```sql
-- Add new columns for Wasabi support
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS file_key TEXT;
ALTER TABLE user_files ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'wasabi';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_files_storage_provider ON user_files(storage_provider);
CREATE INDEX IF NOT EXISTS idx_user_files_file_key ON user_files(file_key);
```

### 4. Install Dependencies

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 5. Wasabi Bucket Policy (Optional)

If you want public read access, add this bucket policy in Wasabi Console:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

**Note:** For private files (recommended), skip this and use signed URLs instead.

---

## How It Works

### Upload Flow
1. User selects file in UI
2. Frontend sends file to `/api/file-manager/upload`
3. API uploads to Wasabi: `users/{userId}/files/{year}/{month}/{id}_{filename}`
4. Wasabi URL and key saved to Supabase `user_files` table

### Download Flow
1. Frontend requests `/api/file-manager/download?fileId=xxx`
2. API checks user permissions
3. API generates signed URL (valid 1 hour)
4. User downloads via signed URL

---

## Files Changed for Wasabi Integration

| File | Purpose |
|------|---------|
| `lib/wasabi/client.ts` | S3 client for Wasabi |
| `lib/wasabi/index.ts` | Module exports |
| `src/app/api/file-manager/upload/route.ts` | Upload API (uses Wasabi) |
| `src/app/api/file-manager/download/route.ts` | Download API (signed URLs) |
| `features/file-manager/types/index.ts` | TypeScript types |
| `database/file-manager-schema.sql` | Complete SQL schema |

---

## Troubleshooting

### "Storage not configured" error
- Check that all `WASABI_*` environment variables are set
- Restart the dev server after adding env vars

### "Access Denied" from Wasabi
- Verify Access Key ID and Secret are correct
- Check bucket name matches exactly
- Ensure bucket exists in the correct region

### Files not showing
- Run the database migration to add `file_key` and `storage_provider` columns
- Check browser console for API errors

---

## Cost Comparison

| Provider | Storage | Egress | API Calls |
|----------|---------|--------|-----------|
| Wasabi | $6.99/TB/mo | FREE | FREE |
| AWS S3 | $23/TB/mo | $90/TB | $5/million |
| Supabase | $25/100GB | Included | Included |

Wasabi is **80% cheaper** than AWS S3 with no egress fees!
