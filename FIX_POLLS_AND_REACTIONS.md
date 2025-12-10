# Fix Polls and Reactions - Database Setup Guide

## Issues Found

1. ❌ **Reactions not working**: Table `public.group_message_reactions` doesn't exist
2. ❌ **Polls not working**: Table `public.group_polls` doesn't exist
3. ❌ **Poll votes not working**: Table `public.group_poll_votes` doesn't exist

## Solution

Run the SQL migration to create the missing tables.

## Steps to Fix

### 1. Open Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on **SQL Editor** in the left sidebar

### 2. Run the Migration

1. Open the file: `supabase-migrations/create-polls-and-reactions-tables.sql`
2. Copy ALL the content
3. Paste it into the Supabase SQL Editor
4. Click **Run** button (or press `Ctrl + Enter`)

### 3. Verify Tables Were Created

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('group_polls', 'group_poll_votes', 'group_message_reactions');
```

You should see 3 rows returned with the table names.

### 4. Test the Features

#### Test Reactions:
1. Open a group chat
2. Hover over any message
3. Click the smile icon
4. Select an emoji
5. The reaction should appear on the message
6. **Test with 2 users**: Both users should see the reaction in real-time

#### Test Polls:
1. Open a group chat
2. Click the paperclip icon (attachment menu)
3. Click "Create Poll"
4. Enter a question (e.g., "What's your favorite color?")
5. Add options (e.g., "Red", "Blue", "Green")
6. Click "Create Poll"
7. Poll should appear in the chat
8. **Test voting**: Click on an option to vote
9. **Test with 2 users**: Both users should see the poll and can vote

## Expected Results

### Reactions:
- ✅ Reactions appear on messages
- ✅ Other users see reactions in real-time
- ✅ Can toggle reactions on/off
- ✅ Reaction count updates correctly

### Polls:
- ✅ Poll creation works
- ✅ Poll appears in chat as a message
- ✅ Can vote on poll options
- ✅ Results update in real-time
- ✅ Creator/admin can close polls
- ✅ Anonymous voting works

## Database Schema Created

### Tables:

1. **group_polls**
   - Stores poll data
   - Fields: id, group_id, message_id, created_by, question, options, settings, timestamps

2. **group_poll_votes**
   - Stores individual votes
   - Fields: id, poll_id, user_id, option_id, created_at
   - Unique constraint: One vote per user per option

3. **group_message_reactions**
   - Stores message reactions
   - Fields: id, message_id, user_id, emoji, created_at
   - Unique constraint: One reaction per user per emoji per message

### Security:
- ✅ Row Level Security (RLS) enabled
- ✅ Users can only interact with polls/reactions in their groups
- ✅ Users can only delete their own reactions/votes

## Troubleshooting

### If reactions still don't work:
1. Check browser console for errors
2. Make sure user is authenticated
3. Verify user is a member of the group
4. Check Supabase logs for RLS policy errors

### If polls still don't work:
1. Clear browser cache
2. Refresh the page
3. Check that backend server is running
4. Verify the SQL migration ran successfully

### If real-time updates don't work:
1. Enable Realtime in Supabase:
   - Go to Database → Replication
   - Enable replication for: `group_polls`, `group_poll_votes`, `group_message_reactions`
2. Restart the backend server

## Next Steps

After running the migration, both **reactions** and **polls** should work perfectly! 🎉

Test with 2 different user accounts to verify real-time synchronization.
