-- =====================================================
-- Sponsored Ads Models for BioDocs.ai
-- Migration: Add ad_campaigns, ad_impressions, ad_sponsors tables
-- =====================================================

-- Ad Campaigns table
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_name TEXT NOT NULL,
    sponsor_logo TEXT,
    message TEXT,
    url TEXT NOT NULL,
    cta_text TEXT NOT NULL DEFAULT 'Learn More',
    targeting JSONB,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    budget DOUBLE PRECISION NOT NULL DEFAULT 0,
    spent DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost_per_impression DOUBLE PRECISION NOT NULL DEFAULT 0,
    cost_per_click DOUBLE PRECISION NOT NULL DEFAULT 0,
    impressions INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT true,
    approved BOOLEAN NOT NULL DEFAULT false,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ad_campaigns
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active_dates ON public.ad_campaigns (active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_sponsor_name ON public.ad_campaigns (sponsor_name);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_created_at ON public.ad_campaigns (created_at);

-- Ad Impressions table
CREATE TABLE IF NOT EXISTS public.ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    room_id TEXT,
    user_id TEXT,
    user_specialty TEXT,
    user_location TEXT,
    room_type TEXT,
    clicked BOOLEAN NOT NULL DEFAULT false,
    clicked_at TIMESTAMP WITH TIME ZONE,
    dismissed BOOLEAN NOT NULL DEFAULT false,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    user_agent TEXT,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ad_impressions
CREATE INDEX IF NOT EXISTS idx_ad_impressions_campaign_id ON public.ad_impressions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_id ON public.ad_impressions (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_room_id ON public.ad_impressions (room_id);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_created_at ON public.ad_impressions (created_at);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_clicked ON public.ad_impressions (clicked);

-- Ad Sponsors table (optional, for self-service)
CREATE TABLE IF NOT EXISTS public.ad_sponsors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_email TEXT NOT NULL UNIQUE,
    contact_name TEXT,
    logo_url TEXT,
    website TEXT,
    balance DOUBLE PRECISION NOT NULL DEFAULT 0,
    verified BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for ad_sponsors
CREATE INDEX IF NOT EXISTS idx_ad_sponsors_contact_email ON public.ad_sponsors (contact_email);
CREATE INDEX IF NOT EXISTS idx_ad_sponsors_company_name ON public.ad_sponsors (company_name);

-- Enable Row Level Security (optional, can be configured later)
-- ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.ad_sponsors ENABLE ROW LEVEL SECURITY;

-- Trigger for updated_at on ad_campaigns
CREATE OR REPLACE FUNCTION update_ad_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ad_campaigns_updated_at ON public.ad_campaigns;
CREATE TRIGGER trigger_ad_campaigns_updated_at
    BEFORE UPDATE ON public.ad_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_campaigns_updated_at();

-- Trigger for updated_at on ad_sponsors
CREATE OR REPLACE FUNCTION update_ad_sponsors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ad_sponsors_updated_at ON public.ad_sponsors;
CREATE TRIGGER trigger_ad_sponsors_updated_at
    BEFORE UPDATE ON public.ad_sponsors
    FOR EACH ROW
    EXECUTE FUNCTION update_ad_sponsors_updated_at();

-- Grant permissions (adjust as needed)
-- GRANT ALL ON public.ad_campaigns TO authenticated;
-- GRANT ALL ON public.ad_impressions TO authenticated;
-- GRANT ALL ON public.ad_sponsors TO authenticated;
