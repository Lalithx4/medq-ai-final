# Database Backup Instructions

## Backup Date: 2024-12-09

## Option 1: Supabase Dashboard (Easiest)

1. Go to https://supabase.com/dashboard
2. Select your BioDocs project
3. Navigate to Settings → Database → Backups
4. Download the latest backup or create a new one

## Option 2: pg_dump Command

If you have PostgreSQL client tools installed:

```bash
# Get your connection string from Supabase Dashboard → Settings → Database → Connection string

# Run backup (replace with your actual connection string)
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" \
  --format=custom \
  --no-owner \
  --no-privileges \
  -f database-backups/biodocs_backup_20241209.dump
```

## Option 3: Schema-only backup via Supabase CLI

```bash
# Install Supabase CLI if not installed
brew install supabase/tap/supabase

# Login and link project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Pull current schema
supabase db pull
```

## Tables to verify after migration:

### Existing tables (should remain unchanged):
- users, profiles
- documents, pdf_documents
- pdf_chat_sessions, pdf_chat_messages
- pdf_collections, pdf_collection_documents
- streaming_rooms, streaming_participants
- presentations, slides
- credits, credit_transactions

### New tables (will be added):
- groups
- group_members
- group_messages
- group_media
- group_stream_shares
- group_message_reads
- group_typing_indicators
- group_message_reactions
- group_message_mentions
- group_polls
- group_poll_votes
- group_annotations
