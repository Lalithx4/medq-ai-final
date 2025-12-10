-- Create Polls Table
CREATE TABLE IF NOT EXISTS public.group_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    message_id UUID REFERENCES public.group_messages(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_multiple_choice BOOLEAN DEFAULT FALSE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    allow_add_options BOOLEAN DEFAULT FALSE,
    is_closed BOOLEAN DEFAULT FALSE,
    ends_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    total_votes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Poll Votes Table
CREATE TABLE IF NOT EXISTS public.group_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES public.group_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    option_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, user_id, option_id)
);

-- Create Message Reactions Table
CREATE TABLE IF NOT EXISTS public.group_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_polls_group_id ON public.group_polls(group_id);
CREATE INDEX IF NOT EXISTS idx_group_polls_message_id ON public.group_polls(message_id);
CREATE INDEX IF NOT EXISTS idx_group_polls_created_by ON public.group_polls(created_by);
CREATE INDEX IF NOT EXISTS idx_group_poll_votes_poll_id ON public.group_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_group_poll_votes_user_id ON public.group_poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reactions_message_id ON public.group_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reactions_user_id ON public.group_message_reactions(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_polls
CREATE POLICY "Users can view polls in their groups" ON public.group_polls
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can create polls" ON public.group_polls
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Poll creators and admins can update polls" ON public.group_polls
    FOR UPDATE USING (
        created_by = auth.uid() OR
        group_id IN (
            SELECT group_id FROM public.group_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for group_poll_votes
CREATE POLICY "Users can view votes in their group polls" ON public.group_poll_votes
    FOR SELECT USING (
        poll_id IN (
            SELECT id FROM public.group_polls WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can vote on polls" ON public.group_poll_votes
    FOR INSERT WITH CHECK (
        poll_id IN (
            SELECT id FROM public.group_polls WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        ) AND user_id = auth.uid()
    );

CREATE POLICY "Users can remove their votes" ON public.group_poll_votes
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for group_message_reactions
CREATE POLICY "Users can view reactions on messages in their groups" ON public.group_message_reactions
    FOR SELECT USING (
        message_id IN (
            SELECT id FROM public.group_messages WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can add reactions to messages" ON public.group_message_reactions
    FOR INSERT WITH CHECK (
        message_id IN (
            SELECT id FROM public.group_messages WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        ) AND user_id = auth.uid()
    );

CREATE POLICY "Users can remove their own reactions" ON public.group_message_reactions
    FOR DELETE USING (user_id = auth.uid());

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_polls_modtime
    BEFORE UPDATE ON public.group_polls
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Grant necessary permissions
GRANT ALL ON public.group_polls TO authenticated;
GRANT ALL ON public.group_poll_votes TO authenticated;
GRANT ALL ON public.group_message_reactions TO authenticated;

-- =====================================================
-- GROUP EVENTS TABLES
-- =====================================================

-- Create Group Events Table
CREATE TABLE IF NOT EXISTS public.group_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    location_type TEXT DEFAULT 'physical' CHECK (location_type IN ('physical', 'virtual', 'hybrid')),
    meeting_link TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    recurrence JSONB,
    reminder_minutes INTEGER DEFAULT 30,
    color TEXT DEFAULT '#3B82F6',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Event RSVPs Table
CREATE TABLE IF NOT EXISTS public.group_event_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'maybe' CHECK (status IN ('yes', 'no', 'maybe')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create indexes for events
CREATE INDEX IF NOT EXISTS idx_group_events_group_id ON public.group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_group_events_created_by ON public.group_events(created_by);
CREATE INDEX IF NOT EXISTS idx_group_events_start_time ON public.group_events(start_time);
CREATE INDEX IF NOT EXISTS idx_group_event_rsvps_event_id ON public.group_event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_group_event_rsvps_user_id ON public.group_event_rsvps(user_id);

-- Enable RLS for events
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_event_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_events
CREATE POLICY "Users can view events in their groups" ON public.group_events
    FOR SELECT USING (
        group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can create events" ON public.group_events
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Event creators and admins can update events" ON public.group_events
    FOR UPDATE USING (
        created_by = auth.uid() OR
        group_id IN (
            SELECT group_id FROM public.group_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Event creators and admins can delete events" ON public.group_events
    FOR DELETE USING (
        created_by = auth.uid() OR
        group_id IN (
            SELECT group_id FROM public.group_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- RLS Policies for group_event_rsvps
CREATE POLICY "Users can view RSVPs for events in their groups" ON public.group_event_rsvps
    FOR SELECT USING (
        event_id IN (
            SELECT id FROM public.group_events WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can RSVP to events" ON public.group_event_rsvps
    FOR INSERT WITH CHECK (
        event_id IN (
            SELECT id FROM public.group_events WHERE group_id IN (
                SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
            )
        ) AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their RSVP" ON public.group_event_rsvps
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can remove their RSVP" ON public.group_event_rsvps
    FOR DELETE USING (user_id = auth.uid());

-- Trigger for group_events updated_at
CREATE TRIGGER update_group_events_modtime
    BEFORE UPDATE ON public.group_events
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Trigger for group_event_rsvps updated_at
CREATE TRIGGER update_group_event_rsvps_modtime
    BEFORE UPDATE ON public.group_event_rsvps
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- Grant permissions for events
GRANT ALL ON public.group_events TO authenticated;
GRANT ALL ON public.group_event_rsvps TO authenticated;
