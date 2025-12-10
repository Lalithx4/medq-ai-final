-- ============================================
-- VIDEO STREAMING TABLES FOR AGORA
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. STREAMING ROOMS TABLE
CREATE TABLE IF NOT EXISTS streaming_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  room_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'live', 'ended')),
  is_recording BOOLEAN DEFAULT false,
  max_participants INTEGER DEFAULT 100,
  allow_chat BOOLEAN DEFAULT true,
  allow_raise_hand BOOLEAN DEFAULT true,
  waiting_room_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  total_participants INTEGER DEFAULT 0,
  peak_participants INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0
);

-- Indexes for streaming_rooms
CREATE INDEX IF NOT EXISTS idx_streaming_rooms_host ON streaming_rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_streaming_rooms_code ON streaming_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_streaming_rooms_status ON streaming_rooms(status);

-- 2. STREAMING PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS streaming_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES streaming_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('host', 'co-host', 'viewer')),
  is_muted BOOLEAN DEFAULT true,
  is_video_on BOOLEAN DEFAULT false,
  hand_raised BOOLEAN DEFAULT false,
  is_in_waiting_room BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE(room_id, user_id)
);

-- Indexes for streaming_participants
CREATE INDEX IF NOT EXISTS idx_streaming_participants_room ON streaming_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_streaming_participants_user ON streaming_participants(user_id);

-- 3. STREAM CHAT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS stream_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES streaming_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for chat retrieval
CREATE INDEX IF NOT EXISTS idx_stream_chat_room ON stream_chat_messages(room_id, created_at);

-- 4. STREAM RECORDINGS TABLE (for future use)
CREATE TABLE IF NOT EXISTS stream_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES streaming_rooms(id) ON DELETE CASCADE,
  file_url TEXT,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE streaming_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaming_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_recordings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can create rooms" ON streaming_rooms;
DROP POLICY IF EXISTS "Users can view all rooms" ON streaming_rooms;
DROP POLICY IF EXISTS "Hosts can update their rooms" ON streaming_rooms;
DROP POLICY IF EXISTS "Hosts can delete their rooms" ON streaming_rooms;

DROP POLICY IF EXISTS "Users can join rooms" ON streaming_participants;
DROP POLICY IF EXISTS "Users can view participants" ON streaming_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON streaming_participants;
DROP POLICY IF EXISTS "Hosts can update participants" ON streaming_participants;
DROP POLICY IF EXISTS "Users can leave rooms" ON streaming_participants;

DROP POLICY IF EXISTS "Users can view chat messages" ON stream_chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON stream_chat_messages;

DROP POLICY IF EXISTS "Hosts can view recordings" ON stream_recordings;

-- STREAMING ROOMS POLICIES
CREATE POLICY "Users can create rooms" ON streaming_rooms
  FOR INSERT WITH CHECK (host_id = auth.uid());

CREATE POLICY "Users can view all rooms" ON streaming_rooms
  FOR SELECT USING (true);

CREATE POLICY "Hosts can update their rooms" ON streaming_rooms
  FOR UPDATE USING (host_id = auth.uid());

CREATE POLICY "Hosts can delete their rooms" ON streaming_rooms
  FOR DELETE USING (host_id = auth.uid());

-- STREAMING PARTICIPANTS POLICIES
CREATE POLICY "Users can join rooms" ON streaming_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view participants" ON streaming_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can update own participant record" ON streaming_participants
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Hosts can update participants" ON streaming_participants
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM streaming_rooms 
      WHERE id = streaming_participants.room_id 
      AND host_id = auth.uid()
    )
  );

CREATE POLICY "Users can leave rooms" ON streaming_participants
  FOR DELETE USING (user_id = auth.uid());

-- STREAM CHAT MESSAGES POLICIES
CREATE POLICY "Users can view chat messages" ON stream_chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streaming_participants 
      WHERE room_id = stream_chat_messages.room_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send chat messages" ON stream_chat_messages
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- STREAM RECORDINGS POLICIES
CREATE POLICY "Hosts can view recordings" ON stream_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM streaming_rooms 
      WHERE id = stream_recordings.room_id 
      AND host_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update room participant count
CREATE OR REPLACE FUNCTION update_room_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE streaming_rooms
    SET 
      total_participants = total_participants + 1,
      peak_participants = GREATEST(
        peak_participants,
        (SELECT COUNT(*) FROM streaming_participants WHERE room_id = NEW.room_id AND left_at IS NULL)
      )
    WHERE id = NEW.room_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for participant count
DROP TRIGGER IF EXISTS trigger_update_participant_count ON streaming_participants;
CREATE TRIGGER trigger_update_participant_count
  AFTER INSERT ON streaming_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_room_participant_count();

-- ============================================
-- ENABLE REALTIME (Optional)
-- ============================================
-- Uncomment these if you want realtime updates
-- ALTER PUBLICATION supabase_realtime ADD TABLE streaming_rooms;
-- ALTER PUBLICATION supabase_realtime ADD TABLE streaming_participants;
-- ALTER PUBLICATION supabase_realtime ADD TABLE stream_chat_messages;

-- ============================================
-- DONE! Video streaming tables created.
-- ============================================
