-- =====================================================
-- BioDocs AI - Groups Management System
-- WhatsApp-like Group Functionality
-- Migration: 20241202_groups_system.sql
-- =====================================================

-- =====================================================
-- 1. GROUPS TABLE (Main group entity)
-- =====================================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Group settings
    group_type TEXT DEFAULT 'private' CHECK (group_type IN ('public', 'private')),
    max_members INTEGER DEFAULT 256,
    only_admins_can_message BOOLEAN DEFAULT false,
    only_admins_can_add_members BOOLEAN DEFAULT false,
    mute_notifications BOOLEAN DEFAULT false,
    
    -- Invite link
    invite_code TEXT UNIQUE,
    invite_link_enabled BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(group_type);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);

-- =====================================================
-- 2. GROUP MEMBERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Role and permissions
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    
    -- Member settings
    is_muted BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    
    -- Tracking
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Prevent duplicate members
    UNIQUE(group_id, user_id)
);

-- Indexes for group_members
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(group_id, role);

-- =====================================================
-- 3. GROUP MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'stream_share', 'system')),
    
    -- Reply functionality
    reply_to_id UUID REFERENCES group_messages(id) ON DELETE SET NULL,
    
    -- Message metadata
    metadata JSONB DEFAULT '{}',
    
    -- Edit/Delete tracking
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_for_everyone BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for group_messages
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_type ON group_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_group_messages_reply ON group_messages(reply_to_id);

-- =====================================================
-- 4. GROUP MEDIA TABLE (Files, Images, Documents)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- File info
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_key TEXT, -- Storage key for Wasabi/S3
    file_type TEXT NOT NULL, -- image, document, audio, video
    mime_type TEXT,
    file_size INTEGER,
    
    -- Image specific
    width INTEGER,
    height INTEGER,
    thumbnail_url TEXT,
    
    -- Document specific
    page_count INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for group_media
CREATE INDEX IF NOT EXISTS idx_group_media_group ON group_media(group_id);
CREATE INDEX IF NOT EXISTS idx_group_media_message ON group_media(message_id);
CREATE INDEX IF NOT EXISTS idx_group_media_uploaded_by ON group_media(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_group_media_type ON group_media(file_type);
CREATE INDEX IF NOT EXISTS idx_group_media_created ON group_media(created_at DESC);

-- =====================================================
-- 5. GROUP STREAM SHARES TABLE (Video streaming integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_stream_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
    stream_room_id UUID NOT NULL REFERENCES streaming_rooms(id) ON DELETE CASCADE,
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stream info snapshot (in case original is deleted)
    stream_title TEXT,
    stream_description TEXT,
    room_code TEXT,
    
    -- Timestamps
    shared_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for group_stream_shares
CREATE INDEX IF NOT EXISTS idx_group_stream_shares_group ON group_stream_shares(group_id);
CREATE INDEX IF NOT EXISTS idx_group_stream_shares_stream ON group_stream_shares(stream_room_id);
CREATE INDEX IF NOT EXISTS idx_group_stream_shares_shared_by ON group_stream_shares(shared_by);

-- =====================================================
-- 6. MESSAGE READ RECEIPTS (Optional - for "seen by" feature)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, user_id)
);

-- Index for read receipts
CREATE INDEX IF NOT EXISTS idx_group_message_reads_message ON group_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reads_user ON group_message_reads(user_id);

-- =====================================================
-- 7. TYPING INDICATORS TABLE (Real-time)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(group_id, user_id)
);

-- Index for typing
CREATE INDEX IF NOT EXISTS idx_group_typing_group ON group_typing_indicators(group_id);

-- =====================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_stream_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_typing_indicators ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- GROUPS POLICIES
-- =====================================================

-- Users can view groups they are members of
CREATE POLICY "Users can view their groups" ON groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = groups.id 
            AND user_id = auth.uid()
        )
        OR created_by = auth.uid()
    );

-- Users can view public groups
CREATE POLICY "Users can view public groups" ON groups
    FOR SELECT USING (group_type = 'public');

-- Users can create groups
CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Admins can update their groups
CREATE POLICY "Admins can update groups" ON groups
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = groups.id 
            AND user_id = auth.uid() 
            AND role = 'admin'
        )
        OR created_by = auth.uid()
    );

-- Creator can delete groups
CREATE POLICY "Creator can delete groups" ON groups
    FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- GROUP MEMBERS POLICIES
-- =====================================================

-- Members can view other members in their groups
CREATE POLICY "Members can view group members" ON group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
        )
    );

-- Admins can add members (or when only_admins_can_add_members is false)
CREATE POLICY "Can add members" ON group_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members gm
            JOIN groups g ON g.id = gm.group_id
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND (gm.role = 'admin' OR g.only_admins_can_add_members = false)
        )
        OR
        -- Creator can add first member (themselves)
        EXISTS (
            SELECT 1 FROM groups 
            WHERE id = group_members.group_id 
            AND created_by = auth.uid()
        )
        -- Join via invite code
        OR group_members.user_id = auth.uid()
    );

-- Users can update their own membership (mute, notifications)
CREATE POLICY "Users can update own membership" ON group_members
    FOR UPDATE USING (user_id = auth.uid());

-- Admins can update any membership (role changes)
CREATE POLICY "Admins can update memberships" ON group_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
    );

-- Admins can remove members
CREATE POLICY "Admins can remove members" ON group_members
    FOR DELETE USING (
        user_id = auth.uid() -- Can leave group
        OR EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND gm.role = 'admin'
        )
    );

-- =====================================================
-- GROUP MESSAGES POLICIES
-- =====================================================

-- Members can view messages in their groups
CREATE POLICY "Members can view messages" ON group_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_messages.group_id 
            AND user_id = auth.uid()
        )
    );

-- Members can send messages (respecting only_admins_can_message)
CREATE POLICY "Members can send messages" ON group_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members gm
            JOIN groups g ON g.id = gm.group_id
            WHERE gm.group_id = group_messages.group_id
            AND gm.user_id = auth.uid()
            AND (g.only_admins_can_message = false OR gm.role = 'admin')
        )
    );

-- Users can update their own messages (edit)
CREATE POLICY "Users can edit own messages" ON group_messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON group_messages
    FOR DELETE USING (sender_id = auth.uid());

-- =====================================================
-- GROUP MEDIA POLICIES
-- =====================================================

-- Members can view media in their groups
CREATE POLICY "Members can view media" ON group_media
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_media.group_id 
            AND user_id = auth.uid()
        )
    );

-- Members can upload media
CREATE POLICY "Members can upload media" ON group_media
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_media.group_id 
            AND user_id = auth.uid()
        )
    );

-- Users can delete their own media
CREATE POLICY "Users can delete own media" ON group_media
    FOR DELETE USING (uploaded_by = auth.uid());

-- =====================================================
-- GROUP STREAM SHARES POLICIES
-- =====================================================

-- Members can view stream shares
CREATE POLICY "Members can view stream shares" ON group_stream_shares
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_stream_shares.group_id 
            AND user_id = auth.uid()
        )
    );

-- Members can share streams
CREATE POLICY "Members can share streams" ON group_stream_shares
    FOR INSERT WITH CHECK (
        shared_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_stream_shares.group_id 
            AND user_id = auth.uid()
        )
    );

-- =====================================================
-- MESSAGE READS POLICIES
-- =====================================================

-- Members can view read receipts
CREATE POLICY "Members can view read receipts" ON group_message_reads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_messages gm
            JOIN group_members gmem ON gmem.group_id = gm.group_id
            WHERE gm.id = group_message_reads.message_id
            AND gmem.user_id = auth.uid()
        )
    );

-- Users can mark messages as read
CREATE POLICY "Users can mark as read" ON group_message_reads
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- TYPING INDICATORS POLICIES
-- =====================================================

-- Members can see typing indicators
CREATE POLICY "Members can see typing" ON group_typing_indicators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_typing_indicators.group_id 
            AND user_id = auth.uid()
        )
    );

-- Users can update their typing status
CREATE POLICY "Users can update typing" ON group_typing_indicators
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- 9. FUNCTIONS
-- =====================================================

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_group_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-generate invite code on group creation
CREATE OR REPLACE FUNCTION set_group_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := generate_group_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto invite code
DROP TRIGGER IF EXISTS trigger_set_group_invite_code ON groups;
CREATE TRIGGER trigger_set_group_invite_code
    BEFORE INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_group_invite_code();

-- Function to update group's updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups SET updated_at = NOW() WHERE id = NEW.group_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update group timestamp on new message
DROP TRIGGER IF EXISTS trigger_update_group_on_message ON group_messages;
CREATE TRIGGER trigger_update_group_on_message
    AFTER INSERT ON group_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_group_timestamp();

-- Function to clean up old typing indicators (call periodically)
CREATE OR REPLACE FUNCTION cleanup_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM group_typing_indicators 
    WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Function to get unread message count for a user in a group
CREATE OR REPLACE FUNCTION get_unread_count(p_group_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    last_read TIMESTAMPTZ;
    unread_count INTEGER;
BEGIN
    SELECT last_read_at INTO last_read
    FROM group_members
    WHERE group_id = p_group_id AND user_id = p_user_id;
    
    SELECT COUNT(*) INTO unread_count
    FROM group_messages
    WHERE group_id = p_group_id
    AND created_at > COALESCE(last_read, '1970-01-01')
    AND sender_id != p_user_id
    AND is_deleted = false;
    
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 10. REALTIME SUBSCRIPTIONS (Enable for Supabase Realtime)
-- =====================================================

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE group_typing_indicators;

-- Enable realtime for members (join/leave notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- =====================================================
-- 11. VIEWS FOR EASIER QUERIES
-- =====================================================

-- View for groups with member count and last message
CREATE OR REPLACE VIEW group_summary AS
SELECT 
    g.*,
    (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
    (
        SELECT json_build_object(
            'id', gm.id,
            'content', gm.content,
            'message_type', gm.message_type,
            'created_at', gm.created_at,
            'sender_id', gm.sender_id
        )
        FROM group_messages gm
        WHERE gm.group_id = g.id
        AND gm.is_deleted = false
        ORDER BY gm.created_at DESC
        LIMIT 1
    ) as last_message
FROM groups g;

-- =====================================================
-- DONE! 
-- =====================================================
