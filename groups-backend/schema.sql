-- =====================================================
-- BioDocs AI - Groups Management System
-- Complete Database Schema
-- WhatsApp-like Group Functionality with Enhanced Features
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
    
    -- Enhanced features
    is_pinned BOOLEAN DEFAULT false,
    pinned_at TIMESTAMPTZ,
    pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    link_preview JSONB, -- {url, title, description, image_url, site_name, type, favicon_url}
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for group_messages
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_type ON group_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_group_messages_reply ON group_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_pinned ON group_messages(group_id, is_pinned) WHERE is_pinned = true;

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
-- 6. MESSAGE READ RECEIPTS
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
-- 8. MESSAGE REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One reaction per emoji per user per message
    UNIQUE(message_id, user_id, emoji)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON group_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON group_message_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_emoji ON group_message_reactions(emoji);

-- =====================================================
-- 9. MENTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_message_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(message_id, mentioned_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_mentions_message ON group_message_mentions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_mentions_user ON group_message_mentions(mentioned_user_id);

-- =====================================================
-- 10. POLLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Poll content
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]', -- [{id: uuid, text: string}]
    
    -- Poll settings
    is_multiple_choice BOOLEAN DEFAULT false,
    is_anonymous BOOLEAN DEFAULT false,
    allow_add_options BOOLEAN DEFAULT false,
    
    -- Poll status
    is_closed BOOLEAN DEFAULT false,
    ends_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_polls_group ON group_polls(group_id);
CREATE INDEX IF NOT EXISTS idx_group_polls_message ON group_polls(message_id);
CREATE INDEX IF NOT EXISTS idx_group_polls_creator ON group_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_group_polls_active ON group_polls(group_id, is_closed) WHERE is_closed = false;

-- =====================================================
-- 11. POLL VOTES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS group_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES group_polls(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- For single choice polls, one vote per user
    -- For multiple choice, one vote per option per user
    UNIQUE(poll_id, option_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON group_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON group_poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option ON group_poll_votes(poll_id, option_id);

-- =====================================================
-- 12. ANNOTATIONS TABLE (For collaborative document annotations)
-- =====================================================
CREATE TABLE IF NOT EXISTS group_annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    media_id UUID REFERENCES group_media(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Annotation content
    content TEXT NOT NULL,
    annotation_type TEXT DEFAULT 'highlight' CHECK (annotation_type IN ('highlight', 'comment', 'note')),
    
    -- Position info (for highlighting)
    position_data JSONB, -- {page, startOffset, endOffset, selectedText, rect}
    color TEXT DEFAULT '#FFEB3B',
    
    -- Thread/Reply support
    parent_id UUID REFERENCES group_annotations(id) ON DELETE CASCADE,
    
    -- Status
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_annotations_group ON group_annotations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_annotations_media ON group_annotations(media_id);
CREATE INDEX IF NOT EXISTS idx_group_annotations_creator ON group_annotations(created_by);
CREATE INDEX IF NOT EXISTS idx_group_annotations_parent ON group_annotations(parent_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_stream_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_annotations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- GROUPS POLICIES
-- =====================================================

CREATE POLICY "Users can view their groups" ON groups
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can view public groups" ON groups
    FOR SELECT USING (group_type = 'public');

CREATE POLICY "Users can create groups" ON groups
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update groups" ON groups
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin')
        OR created_by = auth.uid()
    );

CREATE POLICY "Creator can delete groups" ON groups
    FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- GROUP MEMBERS POLICIES
-- =====================================================

CREATE POLICY "Members can view group members" ON group_members
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid())
    );

CREATE POLICY "Can add members" ON group_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_members gm
            JOIN groups g ON g.id = gm.group_id
            WHERE gm.group_id = group_members.group_id
            AND gm.user_id = auth.uid()
            AND (gm.role = 'admin' OR g.only_admins_can_add_members = false)
        )
        OR EXISTS (SELECT 1 FROM groups WHERE id = group_members.group_id AND created_by = auth.uid())
        OR group_members.user_id = auth.uid()
    );

CREATE POLICY "Users can update own membership" ON group_members
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can update memberships" ON group_members
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    );

CREATE POLICY "Admins can remove members" ON group_members
    FOR DELETE USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM group_members gm WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin')
    );

-- =====================================================
-- GROUP MESSAGES POLICIES
-- =====================================================

CREATE POLICY "Members can view messages" ON group_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM group_members WHERE group_id = group_messages.group_id AND user_id = auth.uid())
    );

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

CREATE POLICY "Users can edit own messages" ON group_messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON group_messages
    FOR DELETE USING (sender_id = auth.uid());

-- =====================================================
-- OTHER TABLE POLICIES (Similar pattern)
-- =====================================================

-- GROUP MEDIA
CREATE POLICY "Members can view media" ON group_media
    FOR SELECT USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = group_media.group_id AND user_id = auth.uid()));

CREATE POLICY "Members can upload media" ON group_media
    FOR INSERT WITH CHECK (uploaded_by = auth.uid() AND EXISTS (SELECT 1 FROM group_members WHERE group_id = group_media.group_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete own media" ON group_media
    FOR DELETE USING (uploaded_by = auth.uid());

-- MESSAGE READS
CREATE POLICY "Members can view read receipts" ON group_message_reads
    FOR SELECT USING (EXISTS (SELECT 1 FROM group_messages gm JOIN group_members gmem ON gmem.group_id = gm.group_id WHERE gm.id = group_message_reads.message_id AND gmem.user_id = auth.uid()));

CREATE POLICY "Users can mark as read" ON group_message_reads
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- REACTIONS
CREATE POLICY "Members can view reactions" ON group_message_reactions
    FOR SELECT USING (EXISTS (SELECT 1 FROM group_messages gm JOIN group_members mem ON mem.group_id = gm.group_id WHERE gm.id = group_message_reactions.message_id AND mem.user_id = auth.uid()));

CREATE POLICY "Members can add reactions" ON group_message_reactions
    FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM group_messages gm JOIN group_members mem ON mem.group_id = gm.group_id WHERE gm.id = group_message_reactions.message_id AND mem.user_id = auth.uid()));

CREATE POLICY "Users can remove own reactions" ON group_message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- POLLS
CREATE POLICY "Members can view polls" ON group_polls
    FOR SELECT USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = group_polls.group_id AND user_id = auth.uid()));

CREATE POLICY "Members can create polls" ON group_polls
    FOR INSERT WITH CHECK (created_by = auth.uid() AND EXISTS (SELECT 1 FROM group_members WHERE group_id = group_polls.group_id AND user_id = auth.uid()));

CREATE POLICY "Creators can update polls" ON group_polls
    FOR UPDATE USING (created_by = auth.uid());

-- POLL VOTES
CREATE POLICY "Members can vote" ON group_poll_votes
    FOR INSERT WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM group_polls p JOIN group_members mem ON mem.group_id = p.group_id WHERE p.id = group_poll_votes.poll_id AND mem.user_id = auth.uid() AND p.is_closed = false));

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate unique invite code
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

-- Auto-generate invite code on group creation
CREATE OR REPLACE FUNCTION set_group_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := generate_group_invite_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_group_invite_code ON groups;
CREATE TRIGGER trigger_set_group_invite_code
    BEFORE INSERT ON groups
    FOR EACH ROW
    EXECUTE FUNCTION set_group_invite_code();

-- Update group timestamp on new message
CREATE OR REPLACE FUNCTION update_group_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE groups SET updated_at = NOW() WHERE id = NEW.group_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_group_on_message ON group_messages;
CREATE TRIGGER trigger_update_group_on_message
    AFTER INSERT ON group_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_group_timestamp();

-- Get unread message count
CREATE OR REPLACE FUNCTION get_unread_count(p_group_id UUID, p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    last_read TIMESTAMPTZ;
    unread_count INTEGER;
BEGIN
    SELECT last_read_at INTO last_read FROM group_members WHERE group_id = p_group_id AND user_id = p_user_id;
    SELECT COUNT(*) INTO unread_count FROM group_messages WHERE group_id = p_group_id AND created_at > COALESCE(last_read, '1970-01-01') AND sender_id != p_user_id AND is_deleted = false;
    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Get reaction counts for a message
CREATE OR REPLACE FUNCTION get_message_reactions(p_message_id UUID)
RETURNS TABLE (emoji TEXT, count BIGINT, users JSON) AS $$
BEGIN
    RETURN QUERY
    SELECT r.emoji, COUNT(*)::BIGINT, JSON_AGG(JSON_BUILD_OBJECT('id', r.user_id, 'name', u.raw_user_meta_data->>'name'))
    FROM group_message_reactions r
    LEFT JOIN auth.users u ON u.id = r.user_id
    WHERE r.message_id = p_message_id
    GROUP BY r.emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get poll results
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (option_id TEXT, vote_count BIGINT, voters JSON) AS $$
DECLARE
    v_is_anonymous BOOLEAN;
BEGIN
    SELECT is_anonymous INTO v_is_anonymous FROM group_polls WHERE id = p_poll_id;
    RETURN QUERY
    SELECT v.option_id, COUNT(*)::BIGINT,
        CASE WHEN v_is_anonymous THEN NULL ELSE JSON_AGG(JSON_BUILD_OBJECT('id', v.user_id, 'name', u.raw_user_meta_data->>'name')) END
    FROM group_poll_votes v
    LEFT JOIN auth.users u ON u.id = v.user_id
    WHERE v.poll_id = p_poll_id
    GROUP BY v.option_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VIEWS
-- =====================================================

-- Group summary view with member count and last message
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
        WHERE gm.group_id = g.id AND gm.is_deleted = false
        ORDER BY gm.created_at DESC
        LIMIT 1
    ) as last_message
FROM groups g;

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE group_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE group_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE group_poll_votes;
