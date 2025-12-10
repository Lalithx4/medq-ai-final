-- Collection Collaboration Feature
-- Adds member sharing to collections (like Google Drive)
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. COLLECTION MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS collection_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES file_collections(id) ON DELETE CASCADE,
  user_id UUID,                    -- NULL if user hasn't signed up yet
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'editor', 'viewer')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  invited_by UUID NOT NULL,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, email)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collection_members_collection_id ON collection_members(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_members_user_id ON collection_members(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_members_email ON collection_members(email);
CREATE INDEX IF NOT EXISTS idx_collection_members_status ON collection_members(status);

-- ============================================
-- 2. ADD SHARING COLUMNS TO FILE_COLLECTIONS
-- ============================================
ALTER TABLE file_collections ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;
ALTER TABLE file_collections ADD COLUMN IF NOT EXISTS share_link UUID DEFAULT gen_random_uuid();
ALTER TABLE file_collections ADD COLUMN IF NOT EXISTS share_link_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE file_collections ADD COLUMN IF NOT EXISTS share_link_access TEXT DEFAULT 'login' CHECK (share_link_access IN ('public', 'login'));
ALTER TABLE file_collections ADD COLUMN IF NOT EXISTS share_link_role TEXT DEFAULT 'viewer' CHECK (share_link_role IN ('viewer', 'editor'));

-- ============================================
-- 3. COLLECTION PRESENCE TABLE (Who's Online)
-- ============================================
CREATE TABLE IF NOT EXISTS collection_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES file_collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_email TEXT,
  user_name TEXT,
  user_avatar TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(collection_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_presence_collection_id ON collection_presence(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_presence_last_seen ON collection_presence(last_seen);

-- ============================================
-- 4. ENABLE RLS
-- ============================================
ALTER TABLE collection_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_presence ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS POLICIES FOR collection_members
-- ============================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view collection members" ON collection_members;
DROP POLICY IF EXISTS "Owners can manage collection members" ON collection_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON collection_members;

-- Users can see members of collections they own or are members of
CREATE POLICY "Users can view collection members" ON collection_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    invited_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM file_collections fc 
      WHERE fc.id = collection_id AND fc.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM collection_members cm 
      WHERE cm.collection_id = collection_members.collection_id 
      AND cm.user_id = auth.uid() 
      AND cm.status = 'accepted'
    )
  );

-- Collection owners can add/remove members
CREATE POLICY "Owners can manage collection members" ON collection_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM file_collections fc 
      WHERE fc.id = collection_id AND fc.user_id = auth.uid()
    )
  );

-- Users can update their own membership (accept/reject invite)
CREATE POLICY "Users can update their own membership" ON collection_members
  FOR UPDATE USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================
-- 6. RLS POLICIES FOR collection_presence
-- ============================================
DROP POLICY IF EXISTS "Users can view presence" ON collection_presence;
DROP POLICY IF EXISTS "Users can manage own presence" ON collection_presence;

CREATE POLICY "Users can view presence" ON collection_presence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM file_collections fc 
      WHERE fc.id = collection_id AND fc.user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM collection_members cm 
      WHERE cm.collection_id = collection_presence.collection_id 
      AND cm.user_id = auth.uid() 
      AND cm.status = 'accepted'
    )
  );

CREATE POLICY "Users can manage own presence" ON collection_presence
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to update shared status automatically
CREATE OR REPLACE FUNCTION update_collection_shared_status()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE file_collections 
  SET is_shared = EXISTS (
    SELECT 1 FROM collection_members 
    WHERE collection_id = COALESCE(NEW.collection_id, OLD.collection_id)
    AND status = 'accepted'
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.collection_id, OLD.collection_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-update
DROP TRIGGER IF EXISTS trigger_update_collection_shared ON collection_members;
CREATE TRIGGER trigger_update_collection_shared
  AFTER INSERT OR UPDATE OR DELETE ON collection_members
  FOR EACH ROW EXECUTE FUNCTION update_collection_shared_status();

-- Function to clean up old presence records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM collection_presence 
  WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_collection_members_updated ON collection_members;
CREATE TRIGGER trigger_collection_members_updated
  BEFORE UPDATE ON collection_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. ENABLE REALTIME FOR PRESENCE
-- ============================================
-- Run this separately if needed:
-- ALTER PUBLICATION supabase_realtime ADD TABLE collection_presence;
