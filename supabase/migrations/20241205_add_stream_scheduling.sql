-- ============================================
-- ADD SCHEDULING FIELDS TO STREAMING ROOMS
-- Run this in Supabase SQL Editor
-- ============================================

-- Add scheduling columns to streaming_rooms
ALTER TABLE streaming_rooms 
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_rule TEXT;

-- Update status check constraint to include 'scheduled'
ALTER TABLE streaming_rooms DROP CONSTRAINT IF EXISTS streaming_rooms_status_check;
ALTER TABLE streaming_rooms ADD CONSTRAINT streaming_rooms_status_check 
  CHECK (status IN ('waiting', 'live', 'ended', 'scheduled'));

-- Create index for scheduled streams
CREATE INDEX IF NOT EXISTS idx_streaming_rooms_scheduled 
  ON streaming_rooms(scheduled_at) 
  WHERE scheduled_at IS NOT NULL;

-- Create index for recurring streams
CREATE INDEX IF NOT EXISTS idx_streaming_rooms_recurring 
  ON streaming_rooms(is_recurring) 
  WHERE is_recurring = true;

-- ============================================
-- HELPER FUNCTION: Check if stream can start
-- ============================================
CREATE OR REPLACE FUNCTION can_start_stream(room_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  room_record RECORD;
  start_window TIMESTAMPTZ;
BEGIN
  SELECT * INTO room_record FROM streaming_rooms WHERE id = room_id;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- If no scheduled time, can start anytime
  IF room_record.scheduled_at IS NULL THEN
    RETURN true;
  END IF;
  
  -- Allow starting 15 minutes before scheduled time
  start_window := room_record.scheduled_at - INTERVAL '15 minutes';
  
  RETURN NOW() >= start_window;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Auto-update status for scheduled streams
-- ============================================
CREATE OR REPLACE FUNCTION update_scheduled_stream_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If scheduled_at is set and in the future, set status to 'scheduled'
  IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_at > NOW() THEN
    NEW.status := 'scheduled';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating status
DROP TRIGGER IF EXISTS trigger_update_scheduled_status ON streaming_rooms;
CREATE TRIGGER trigger_update_scheduled_status
  BEFORE INSERT OR UPDATE OF scheduled_at ON streaming_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_scheduled_stream_status();

-- ============================================
-- DONE! Scheduling fields added.
-- ============================================
