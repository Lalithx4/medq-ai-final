-- =====================================================
-- BioDocs AI - Groups Management System (SIMPLIFIED)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. GROUPS TABLE
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    group_type TEXT DEFAULT 'private' CHECK (group_type IN ('public', 'private')),
    max_members INTEGER DEFAULT 256,
    only_admins_can_message BOOLEAN DEFAULT false,
    only_admins_can_add_members BOOLEAN DEFAULT false,
    mute_notifications BOOLEAN DEFAULT false,
    invite_code TEXT UNIQUE,
    invite_link_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON groups(invite_code);

-- 2. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    is_muted BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,
    added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);

-- 3. GROUP MESSAGES TABLE
CREATE TABLE IF NOT EXISTS group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'audio', 'video', 'stream_share', 'system')),
    reply_to_id UUID REFERENCES group_messages(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    deleted_for_everyone BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(group_id, created_at DESC);

-- 4. GROUP MEDIA TABLE
CREATE TABLE IF NOT EXISTS group_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_key TEXT,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    file_size INTEGER,
    width INTEGER,
    height INTEGER,
    thumbnail_url TEXT,
    page_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_media_group ON group_media(group_id);

-- 5. GROUP STREAM SHARES TABLE (Without foreign key to streaming_rooms)
CREATE TABLE IF NOT EXISTS group_stream_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
    stream_room_id UUID, -- Optional: No FK constraint
    shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stream_title TEXT,
    stream_description TEXT,
    room_code TEXT,
    shared_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_group_stream_shares_group ON group_stream_shares(group_id);

-- 6. MESSAGE READ RECEIPTS
CREATE TABLE IF NOT EXISTS group_message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- 7. TYPING INDICATORS
CREATE TABLE IF NOT EXISTS group_typing_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_stream_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_typing_indicators ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- GROUPS POLICIES
CREATE POLICY "Users can view their groups" ON groups
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
        OR created_by = auth.uid()
        OR group_type = 'public'
    );

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update groups" ON groups
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin')
        OR created_by = auth.uid()
    );

CREATE POLICY "Creator can delete groups" ON groups
    FOR DELETE USING (created_by = auth.uid());

-- GROUP MEMBERS POLICIES
CREATE POLICY "Members can view group members" ON group_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
    );

CREATE POLICY "Can add members" ON group_members
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND created_by = auth.uid())
        OR group_members.user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM group_members gm
            JOIN groups g ON g.id = gm.group_id
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND (gm.role = 'admin' OR g.only_admins_can_add_members = false)
        )
    );

CREATE POLICY "Users can update own membership" ON group_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can update memberships" ON group_members
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    );

CREATE POLICY "Can remove members" ON group_members
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    );

-- GROUP MESSAGES POLICIES
CREATE POLICY "Members can view messages" ON group_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
    );

CREATE POLICY "Members can send messages" ON group_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can edit own messages" ON group_messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON group_messages
    FOR DELETE USING (sender_id = auth.uid());

-- GROUP MEDIA POLICIES
CREATE POLICY "Members can view media" ON group_media
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = group_media.group_id AND user_id = auth.uid())
    );

CREATE POLICY "Members can upload media" ON group_media
    FOR INSERT WITH CHECK (
        uploaded_by = auth.uid()
        AND EXISTS (SELECT 1 FROM group_members WHERE group_id = group_media.group_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can delete own media" ON group_media
    FOR DELETE USING (uploaded_by = auth.uid());

-- STREAM SHARES POLICIES
CREATE POLICY "Members can view stream shares" ON group_stream_shares
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = group_stream_shares.group_id AND user_id = auth.uid())
    );

CREATE POLICY "Members can share streams" ON group_stream_shares
    FOR INSERT WITH CHECK (
        shared_by = auth.uid()
        AND EXISTS (SELECT 1 FROM group_members WHERE group_id = group_stream_shares.group_id AND user_id = auth.uid())
    );

-- MESSAGE READS POLICIES
CREATE POLICY "Members can view read receipts" ON group_message_reads
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_messages gm
            JOIN group_members mem ON mem.group_id = gm.group_id
            WHERE gm.id = group_message_reads.message_id AND mem.user_id = auth.uid()
        )
    );

CREATE POLICY "Members can mark messages read" ON group_message_reads
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- TYPING INDICATORS POLICIES
CREATE POLICY "Members can view typing" ON group_typing_indicators
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = group_typing_indicators.group_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can set typing" ON group_typing_indicators
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can clear typing" ON group_typing_indicators
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- HELPER FUNCTION: Generate Invite Code
-- =====================================================
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-generate invite code on group creation
-- =====================================================
CREATE OR REPLACE FUNCTION set_group_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := generate_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invite_code ON groups;
CREATE TRIGGER trigger_set_invite_code
    BEFORE INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_group_invite_code();

-- =====================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_groups_updated_at ON groups;
CREATE TRIGGER trigger_groups_updated_at
    BEFORE UPDATE ON groups
    FOR EACH ROW
    EXECUTE FUNCTION update_groups_updated_at();

-- Done! Groups system is ready.
SELECT 'Groups tables created successfully!' as status;
