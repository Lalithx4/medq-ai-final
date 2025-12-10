-- Fix Video Streaming RLS Policies - Remove Infinite Recursion
-- Run this in Supabase SQL Editor to fix the policies

-- ============================================
-- DROP EXISTING POLICIES (if they exist)
-- ============================================
DROP POLICY IF EXISTS "Users can view rooms they host or participate in" ON streaming_rooms;
DROP POLICY IF EXISTS "Users can view live rooms" ON streaming_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON streaming_rooms;
DROP POLICY IF EXISTS "Hosts can update their rooms" ON streaming_rooms;
DROP POLICY IF EXISTS "Hosts can delete their rooms" ON streaming_rooms;

DROP POLICY IF EXISTS "Users can view participants in their rooms" ON streaming_participants;
DROP POLICY IF EXISTS "Users can join rooms" ON streaming_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON streaming_participants;
DROP POLICY IF EXISTS "Hosts can update participants in their rooms" ON streaming_participants;

DROP POLICY IF EXISTS "Users can view chat in rooms they're in" ON stream_chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON stream_chat_messages;

DROP POLICY IF EXISTS "Hosts can view their recordings" ON stream_recordings;

-- ============================================
-- STREAMING ROOMS POLICIES (Simplified - No Recursion)
-- ============================================

-- Anyone authenticated can view any room (simplest approach)
CREATE POLICY "Authenticated users can view rooms" ON streaming_rooms
  FOR SELECT TO authenticated
  USING (true);

-- Users can create their own rooms
CREATE POLICY "Users can create rooms" ON streaming_rooms
  FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());

-- Hosts can update their rooms
CREATE POLICY "Hosts can update their rooms" ON streaming_rooms
  FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

-- Hosts can delete their rooms
CREATE POLICY "Hosts can delete their rooms" ON streaming_rooms
  FOR DELETE TO authenticated
  USING (host_id = auth.uid());

-- ============================================
-- STREAMING PARTICIPANTS POLICIES (Simplified)
-- ============================================

-- Anyone authenticated can view participants
CREATE POLICY "Authenticated users can view participants" ON streaming_participants
  FOR SELECT TO authenticated
  USING (true);

-- Users can join rooms (insert themselves)
CREATE POLICY "Users can join rooms" ON streaming_participants
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own participant record
CREATE POLICY "Users can update own record" ON streaming_participants
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Hosts can update any participant in their room
CREATE POLICY "Hosts can update participants" ON streaming_participants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM streaming_rooms 
      WHERE streaming_rooms.id = streaming_participants.room_id 
      AND streaming_rooms.host_id = auth.uid()
    )
  );

-- Users can leave (delete their record)
CREATE POLICY "Users can leave rooms" ON streaming_participants
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- STREAM CHAT MESSAGES POLICIES
-- ============================================

-- Anyone authenticated can view chat
CREATE POLICY "Authenticated users can view chat" ON stream_chat_messages
  FOR SELECT TO authenticated
  USING (true);

-- Users can send messages
CREATE POLICY "Users can send chat messages" ON stream_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON stream_chat_messages
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============================================
-- STREAM RECORDINGS POLICIES
-- ============================================

-- Hosts can view recordings of their rooms
CREATE POLICY "Hosts can view recordings" ON stream_recordings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM streaming_rooms 
      WHERE streaming_rooms.id = stream_recordings.room_id 
      AND streaming_rooms.host_id = auth.uid()
    )
  );

-- Hosts can insert recordings
CREATE POLICY "Hosts can create recordings" ON stream_recordings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM streaming_rooms 
      WHERE streaming_rooms.id = room_id 
      AND streaming_rooms.host_id = auth.uid()
    )
  );
