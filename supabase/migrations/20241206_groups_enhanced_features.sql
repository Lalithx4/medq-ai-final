-- =====================================================
-- BioDocs AI - Enhanced Groups Features
-- Migration: 20241206_groups_enhanced_features.sql
-- Features: Reactions, Pinning, Polls, Mentions, Link Previews, Read Receipts
-- =====================================================

-- =====================================================
-- 1. MESSAGE REACTIONS TABLE
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
-- 2. MESSAGE PINNING (Add columns to group_messages)
-- =====================================================
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for pinned messages
CREATE INDEX IF NOT EXISTS idx_group_messages_pinned ON group_messages(group_id, is_pinned) WHERE is_pinned = true;

-- =====================================================
-- 3. LINK PREVIEWS (Add column to group_messages)
-- =====================================================
ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS link_preview JSONB;
-- Structure: {url, title, description, image_url, site_name, type, favicon_url}
-- type can be: 'website', 'youtube', 'doi', 'twitter', etc.

-- =====================================================
-- 4. MENTIONS TABLE
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
-- 5. POLLS TABLE
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
-- 6. POLL VOTES TABLE
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
-- 7. ANNOTATIONS TABLE (For collaborative document annotations)
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
-- 8. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE group_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_annotations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- REACTIONS POLICIES
-- =====================================================

-- Members can view reactions in their groups
CREATE POLICY "Members can view reactions" ON group_message_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_messages gm
            JOIN group_members mem ON mem.group_id = gm.group_id
            WHERE gm.id = group_message_reactions.message_id
            AND mem.user_id = auth.uid()
        )
    );

-- Members can add reactions
CREATE POLICY "Members can add reactions" ON group_message_reactions
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_messages gm
            JOIN group_members mem ON mem.group_id = gm.group_id
            WHERE gm.id = group_message_reactions.message_id
            AND mem.user_id = auth.uid()
        )
    );

-- Users can remove their own reactions
CREATE POLICY "Users can remove own reactions" ON group_message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- MENTIONS POLICIES
-- =====================================================

-- Members can view mentions
CREATE POLICY "Members can view mentions" ON group_message_mentions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_messages gm
            JOIN group_members mem ON mem.group_id = gm.group_id
            WHERE gm.id = group_message_mentions.message_id
            AND mem.user_id = auth.uid()
        )
    );

-- System/sender can create mentions (when message is created)
CREATE POLICY "Can create mentions" ON group_message_mentions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM group_messages gm
            JOIN group_members mem ON mem.group_id = gm.group_id
            WHERE gm.id = group_message_mentions.message_id
            AND mem.user_id = auth.uid()
        )
    );

-- =====================================================
-- POLLS POLICIES
-- =====================================================

-- Members can view polls in their groups
CREATE POLICY "Members can view polls" ON group_polls
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_polls.group_id 
            AND user_id = auth.uid()
        )
    );

-- Members can create polls
CREATE POLICY "Members can create polls" ON group_polls
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_polls.group_id 
            AND user_id = auth.uid()
        )
    );

-- Creator can update/close their polls
CREATE POLICY "Creators can update polls" ON group_polls
    FOR UPDATE USING (created_by = auth.uid());

-- Creator can delete their polls
CREATE POLICY "Creators can delete polls" ON group_polls
    FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- POLL VOTES POLICIES
-- =====================================================

-- Members can view votes (non-anonymous polls only)
CREATE POLICY "Members can view votes" ON group_poll_votes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_polls p
            JOIN group_members mem ON mem.group_id = p.group_id
            WHERE p.id = group_poll_votes.poll_id
            AND mem.user_id = auth.uid()
            AND (p.is_anonymous = false OR group_poll_votes.user_id = auth.uid())
        )
    );

-- Members can vote
CREATE POLICY "Members can vote" ON group_poll_votes
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_polls p
            JOIN group_members mem ON mem.group_id = p.group_id
            WHERE p.id = group_poll_votes.poll_id
            AND mem.user_id = auth.uid()
            AND p.is_closed = false
        )
    );

-- Users can remove their votes
CREATE POLICY "Users can remove votes" ON group_poll_votes
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- ANNOTATIONS POLICIES
-- =====================================================

-- Members can view annotations
CREATE POLICY "Members can view annotations" ON group_annotations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_annotations.group_id 
            AND user_id = auth.uid()
        )
    );

-- Members can create annotations
CREATE POLICY "Members can create annotations" ON group_annotations
    FOR INSERT WITH CHECK (
        created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members 
            WHERE group_id = group_annotations.group_id 
            AND user_id = auth.uid()
        )
    );

-- Users can update their annotations
CREATE POLICY "Users can update own annotations" ON group_annotations
    FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their annotations
CREATE POLICY "Users can delete own annotations" ON group_annotations
    FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- 9. ENABLE REALTIME FOR NEW TABLES
-- =====================================================

-- Add tables to Supabase Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE group_message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE group_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE group_poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE group_annotations;

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to get reaction counts for a message
CREATE OR REPLACE FUNCTION get_message_reactions(p_message_id UUID)
RETURNS TABLE (
    emoji TEXT,
    count BIGINT,
    users JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.emoji,
        COUNT(*)::BIGINT as count,
        JSON_AGG(JSON_BUILD_OBJECT(
            'id', r.user_id,
            'name', u.raw_user_meta_data->>'name'
        )) as users
    FROM group_message_reactions r
    LEFT JOIN auth.users u ON u.id = r.user_id
    WHERE r.message_id = p_message_id
    GROUP BY r.emoji;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get poll results
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (
    option_id TEXT,
    vote_count BIGINT,
    voters JSON
) AS $$
DECLARE
    v_is_anonymous BOOLEAN;
BEGIN
    SELECT is_anonymous INTO v_is_anonymous FROM group_polls WHERE id = p_poll_id;
    
    RETURN QUERY
    SELECT 
        v.option_id,
        COUNT(*)::BIGINT as vote_count,
        CASE 
            WHEN v_is_anonymous THEN NULL
            ELSE JSON_AGG(JSON_BUILD_OBJECT(
                'id', v.user_id,
                'name', u.raw_user_meta_data->>'name'
            ))
        END as voters
    FROM group_poll_votes v
    LEFT JOIN auth.users u ON u.id = v.user_id
    WHERE v.poll_id = p_poll_id
    GROUP BY v.option_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update poll timestamp
CREATE OR REPLACE FUNCTION update_poll_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_poll_updated
    BEFORE UPDATE ON group_polls
    FOR EACH ROW
    EXECUTE FUNCTION update_poll_timestamp();

-- Function to update annotation timestamp
CREATE OR REPLACE FUNCTION update_annotation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_annotation_updated
    BEFORE UPDATE ON group_annotations
    FOR EACH ROW
    EXECUTE FUNCTION update_annotation_timestamp();
