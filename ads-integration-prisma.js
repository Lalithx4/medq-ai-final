/**
 * BioDocs.ai Sponsored Ads Integration with Prisma
 * =================================================
 * 
 * This module integrates with your existing BioDocs.ai Prisma schema
 * to manage targeted sponsor ads in MiroTalk SFU meeting rooms.
 * 
 * Prerequisites:
 * 1. Add the ad models from prisma-ads-schema.prisma to your schema.prisma
 * 2. Run: npx prisma migrate dev --name add_ads_models
 * 3. Import this module in your BioDocs.ai backend
 * 
 * @author BioDocs.ai
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
    MIROTALK_URL: process.env.MIROTALK_URL || 'https://video.biodocs.ai',
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
    BIODOCS_API_URL: process.env.BIODOCS_API_URL || 'https://biodocs.ai/api',
};

// =============================================================================
// AD SERVICE CLASS (Uses Prisma)
// =============================================================================

class AdService {
    /**
     * @param {import('@prisma/client').PrismaClient} prisma - Prisma client instance
     */
    constructor(prisma, config = CONFIG) {
        this.prisma = prisma;
        this.config = config;
    }

    // =========================================================================
    // CAMPAIGN MANAGEMENT
    // =========================================================================

    /**
     * Create a new ad campaign
     */
    async createCampaign(data) {
        return this.prisma.adCampaign.create({
            data: {
                sponsorName: data.sponsorName,
                sponsorLogo: data.sponsorLogo,
                message: data.message,
                url: data.url,
                ctaText: data.ctaText || 'Learn More',
                targeting: data.targeting || {},
                startDate: new Date(data.startDate || Date.now()),
                endDate: new Date(data.endDate || Date.now() + 30 * 24 * 60 * 60 * 1000),
                budget: data.budget || 0,
                costPerImpression: data.costPerImpression || 0,
                costPerClick: data.costPerClick || 0,
                active: data.active ?? true,
                approved: data.approved ?? false,
                createdBy: data.createdBy,
            },
        });
    }

    /**
     * Update a campaign
     */
    async updateCampaign(id, data) {
        return this.prisma.adCampaign.update({
            where: { id },
            data,
        });
    }

    /**
     * Delete a campaign
     */
    async deleteCampaign(id) {
        return this.prisma.adCampaign.delete({
            where: { id },
        });
    }

    /**
     * Get all campaigns with optional filters
     */
    async getCampaigns(filters = {}) {
        const where = {};
        
        if (filters.active !== undefined) where.active = filters.active;
        if (filters.approved !== undefined) where.approved = filters.approved;
        if (filters.sponsorName) where.sponsorName = { contains: filters.sponsorName, mode: 'insensitive' };

        return this.prisma.adCampaign.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { AdImpressions: true },
                },
            },
        });
    }

    /**
     * Get active campaigns (approved, within date range, has budget)
     */
    async getActiveCampaigns() {
        const now = new Date();
        return this.prisma.adCampaign.findMany({
            where: {
                active: true,
                approved: true,
                startDate: { lte: now },
                endDate: { gte: now },
            },
        });
    }

    /**
     * Get campaign by ID with analytics
     */
    async getCampaignWithAnalytics(id) {
        const campaign = await this.prisma.adCampaign.findUnique({
            where: { id },
            include: {
                AdImpressions: {
                    take: 100,
                    orderBy: { createdAt: 'desc' },
                },
                _count: {
                    select: { AdImpressions: true },
                },
            },
        });

        if (!campaign) return null;

        // Calculate CTR
        const ctr = campaign.impressions > 0 
            ? (campaign.clicks / campaign.impressions) * 100 
            : 0;

        return {
            ...campaign,
            ctr: ctr.toFixed(2),
            totalImpressions: campaign.impressions,
            totalClicks: campaign.clicks,
        };
    }

    // =========================================================================
    // AD TARGETING & SELECTION
    // =========================================================================

    /**
     * Select the best ad for a user/room context
     * This is the main method called when generating meeting URLs
     * 
     * @param {Object} context - User and room context
     * @param {string} context.userId - User ID from BioDocs.ai
     * @param {string} context.userEmail - User email
     * @param {string} context.specialty - User's medical specialty (from User.interests or profile)
     * @param {string} context.location - User's location
     * @param {string} context.roomType - Type of meeting room
     * @param {string} context.roomId - Room ID
     */
    async selectTargetedAd(context) {
        const { userId, userEmail, specialty, location, roomType, roomId } = context;
        
        const activeCampaigns = await this.getActiveCampaigns();
        
        if (activeCampaigns.length === 0) {
            return null;
        }

        // Score each campaign based on targeting match
        const scoredCampaigns = activeCampaigns.map((campaign) => {
            let score = 0;
            const targeting = campaign.targeting || {};

            // Specific user targeting (highest priority)
            if (targeting.userIds?.includes(userId) || targeting.userEmails?.includes(userEmail)) {
                score += 100;
            }

            // Specialty match
            if (specialty && targeting.specialties?.includes(specialty.toLowerCase())) {
                score += 50;
            }

            // Location match
            if (location && targeting.locations?.includes(location.toLowerCase())) {
                score += 30;
            }

            // Room type match
            if (roomType && targeting.roomTypes?.includes(roomType.toLowerCase())) {
                score += 20;
            }

            // No targeting = show to everyone (lower priority)
            const hasNoTargeting = 
                !targeting.specialties?.length &&
                !targeting.locations?.length &&
                !targeting.roomTypes?.length &&
                !targeting.userIds?.length &&
                !targeting.userEmails?.length;
            
            if (hasNoTargeting) {
                score += 10;
            }

            return { campaign, score };
        });

        // Sort by score (highest first)
        scoredCampaigns.sort((a, b) => b.score - a.score);

        const selected = scoredCampaigns[0];
        if (selected && selected.score > 0) {
            const campaign = selected.campaign;
            
            // Create impression record
            const impression = await this.createImpression({
                campaignId: campaign.id,
                roomId,
                userId,
                userSpecialty: specialty,
                userLocation: location,
                roomType,
            });

            return {
                sponsor: campaign.sponsorName,
                sponsorLogo: campaign.sponsorLogo,
                message: campaign.message,
                url: campaign.url,
                ctaText: campaign.ctaText,
                impressionId: impression.id,
                campaignId: campaign.id,
                trackingUrl: `${this.config.BIODOCS_API_URL}/ads/track`,
            };
        }

        return null;
    }

    // =========================================================================
    // IMPRESSION & CLICK TRACKING
    // =========================================================================

    /**
     * Create an impression record
     */
    async createImpression(data) {
        // Create impression
        const impression = await this.prisma.adImpression.create({
            data: {
                campaignId: data.campaignId,
                roomId: data.roomId,
                userId: data.userId,
                userSpecialty: data.userSpecialty,
                userLocation: data.userLocation,
                roomType: data.roomType,
                userAgent: data.userAgent,
                ipAddress: data.ipAddress,
            },
        });

        // Update campaign impression count
        await this.prisma.adCampaign.update({
            where: { id: data.campaignId },
            data: {
                impressions: { increment: 1 },
                spent: { increment: await this.getCampaignCPI(data.campaignId) },
            },
        });

        return impression;
    }

    /**
     * Track a click event
     */
    async trackClick(impressionId) {
        const impression = await this.prisma.adImpression.findUnique({
            where: { id: impressionId },
        });

        if (!impression || impression.clicked) {
            return { success: false, message: 'Already clicked or not found' };
        }

        // Update impression
        await this.prisma.adImpression.update({
            where: { id: impressionId },
            data: {
                clicked: true,
                clickedAt: new Date(),
            },
        });

        // Update campaign click count
        await this.prisma.adCampaign.update({
            where: { id: impression.campaignId },
            data: {
                clicks: { increment: 1 },
                spent: { increment: await this.getCampaignCPC(impression.campaignId) },
            },
        });

        return { success: true };
    }

    /**
     * Track dismiss event
     */
    async trackDismiss(impressionId) {
        await this.prisma.adImpression.update({
            where: { id: impressionId },
            data: {
                dismissed: true,
                dismissedAt: new Date(),
            },
        });

        return { success: true };
    }

    /**
     * Track any event from client
     */
    async trackEvent(eventData) {
        const { event, impressionId } = eventData;

        switch (event) {
            case 'click':
                return this.trackClick(impressionId);
            case 'dismiss':
                return this.trackDismiss(impressionId);
            case 'impression':
                // Already tracked when ad was selected
                return { success: true };
            default:
                return { success: false, message: 'Unknown event type' };
        }
    }

    /**
     * Get cost per impression for a campaign
     */
    async getCampaignCPI(campaignId) {
        const campaign = await this.prisma.adCampaign.findUnique({
            where: { id: campaignId },
            select: { costPerImpression: true },
        });
        return campaign?.costPerImpression || 0;
    }

    /**
     * Get cost per click for a campaign
     */
    async getCampaignCPC(campaignId) {
        const campaign = await this.prisma.adCampaign.findUnique({
            where: { id: campaignId },
            select: { costPerClick: true },
        });
        return campaign?.costPerClick || 0;
    }

    // =========================================================================
    // ANALYTICS
    // =========================================================================

    /**
     * Get analytics for a campaign
     */
    async getCampaignAnalytics(campaignId, dateRange = {}) {
        const where = { campaignId };
        
        if (dateRange.from) {
            where.createdAt = { gte: new Date(dateRange.from) };
        }
        if (dateRange.to) {
            where.createdAt = { ...where.createdAt, lte: new Date(dateRange.to) };
        }

        const [campaign, impressions, clickedImpressions] = await Promise.all([
            this.prisma.adCampaign.findUnique({ where: { id: campaignId } }),
            this.prisma.adImpression.count({ where }),
            this.prisma.adImpression.count({ where: { ...where, clicked: true } }),
        ]);

        // Group by specialty
        const bySpecialty = await this.prisma.adImpression.groupBy({
            by: ['userSpecialty'],
            where,
            _count: true,
        });

        // Group by location
        const byLocation = await this.prisma.adImpression.groupBy({
            by: ['userLocation'],
            where,
            _count: true,
        });

        return {
            campaign,
            totalImpressions: impressions,
            totalClicks: clickedImpressions,
            ctr: impressions > 0 ? ((clickedImpressions / impressions) * 100).toFixed(2) : 0,
            bySpecialty: bySpecialty.filter(s => s.userSpecialty),
            byLocation: byLocation.filter(l => l.userLocation),
        };
    }

    /**
     * Get overall ads analytics
     */
    async getOverallAnalytics(dateRange = {}) {
        const where = {};
        
        if (dateRange.from) {
            where.createdAt = { gte: new Date(dateRange.from) };
        }
        if (dateRange.to) {
            where.createdAt = { ...where.createdAt, lte: new Date(dateRange.to) };
        }

        const [totalCampaigns, activeCampaigns, totalImpressions, totalClicks, totalSpent] = await Promise.all([
            this.prisma.adCampaign.count(),
            this.prisma.adCampaign.count({ where: { active: true, approved: true } }),
            this.prisma.adImpression.count({ where }),
            this.prisma.adImpression.count({ where: { ...where, clicked: true } }),
            this.prisma.adCampaign.aggregate({ _sum: { spent: true } }),
        ]);

        return {
            totalCampaigns,
            activeCampaigns,
            totalImpressions,
            totalClicks,
            overallCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
            totalSpent: totalSpent._sum.spent || 0,
        };
    }

    // =========================================================================
    // MEETING URL GENERATION
    // =========================================================================

    /**
     * Generate a meeting URL with embedded ad data
     * Call this when a user clicks "Join Meeting" in BioDocs.ai
     * 
     * @param {Object} options - Meeting options
     * @param {Object} user - User object from Prisma (User model)
     * @param {Object} room - StreamingRoom object from Prisma (optional)
     */
    async generateMeetingUrlWithAd(options, user, room = null) {
        const {
            roomId,
            isPresenter = false,
            redirectUrl = 'https://biodocs.ai',
        } = options;

        // Extract user context for targeting
        const userContext = {
            userId: user.id,
            userEmail: user.email,
            specialty: user.interests?.[0] || null, // First interest as specialty
            location: user.location || null,
            roomType: room?.status === 'live' ? 'live' : 'consultation',
            roomId,
        };

        // Select targeted ad
        const adData = await this.selectTargetedAd(userContext);

        // Create JWT payload
        const payload = {
            username: user.name || user.email?.split('@')[0] || 'Guest',
            password: crypto.randomBytes(8).toString('hex'),
            presenter: isPresenter ? '1' : '0',
            ad: adData,
            redirectUrl,
            // Additional user info for display
            userImage: user.image,
            userId: user.id,
        };

        // Encrypt payload
        const encryptedPayload = CryptoJS.AES.encrypt(
            JSON.stringify(payload),
            this.config.JWT_SECRET
        ).toString();

        // Create JWT token
        const token = jwt.sign(
            { data: encryptedPayload },
            this.config.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Build meeting URL
        const meetingUrl = new URL(`${this.config.MIROTALK_URL}/join`);
        meetingUrl.searchParams.set('room', roomId);
        meetingUrl.searchParams.set('roomPassword', 'false');
        meetingUrl.searchParams.set('name', payload.username);
        meetingUrl.searchParams.set('audio', 'true');
        meetingUrl.searchParams.set('video', 'true');
        meetingUrl.searchParams.set('screen', 'false');
        meetingUrl.searchParams.set('hide', 'false');
        meetingUrl.searchParams.set('notify', 'true');
        meetingUrl.searchParams.set('token', token);

        return {
            url: meetingUrl.toString(),
            roomId,
            token,
            ad: adData,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        };
    }
}

// =============================================================================
// EXPRESS.JS ROUTES
// =============================================================================

/**
 * Create Express routes for ad management
 * @param {Express} app - Express app
 * @param {AdService} adService - AdService instance
 */
function createAdRoutes(app, adService) {
    
    // Middleware for admin-only routes
    const adminOnly = (req, res, next) => {
        // Implement your admin check here
        // Example: if (req.user?.role !== 'ADMIN') return res.status(403).json({ error: 'Forbidden' });
        next();
    };

    // =========================================================================
    // CAMPAIGN MANAGEMENT (Admin)
    // =========================================================================

    // Create campaign
    app.post('/api/ads/campaigns', adminOnly, async (req, res) => {
        try {
            const campaign = await adService.createCampaign(req.body);
            res.json({ success: true, campaign });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // List campaigns
    app.get('/api/ads/campaigns', adminOnly, async (req, res) => {
        try {
            const campaigns = await adService.getCampaigns(req.query);
            res.json({ success: true, campaigns });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Get campaign with analytics
    app.get('/api/ads/campaigns/:id', adminOnly, async (req, res) => {
        try {
            const campaign = await adService.getCampaignWithAnalytics(req.params.id);
            if (!campaign) {
                return res.status(404).json({ success: false, error: 'Campaign not found' });
            }
            res.json({ success: true, ...campaign });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Update campaign
    app.put('/api/ads/campaigns/:id', adminOnly, async (req, res) => {
        try {
            const campaign = await adService.updateCampaign(req.params.id, req.body);
            res.json({ success: true, campaign });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Delete campaign
    app.delete('/api/ads/campaigns/:id', adminOnly, async (req, res) => {
        try {
            await adService.deleteCampaign(req.params.id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // =========================================================================
    // AD SERVING & TRACKING (Public)
    // =========================================================================

    // Get targeted ad (called by MiroTalk SFU client)
    app.post('/api/ads/targeted', async (req, res) => {
        try {
            const ad = await adService.selectTargetedAd(req.body);
            res.json({ success: true, ad });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Track events (called by MiroTalk SFU client)
    app.post('/api/ads/track', async (req, res) => {
        try {
            const result = await adService.trackEvent(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // =========================================================================
    // ANALYTICS (Admin)
    // =========================================================================

    // Campaign analytics
    app.get('/api/ads/campaigns/:id/analytics', adminOnly, async (req, res) => {
        try {
            const analytics = await adService.getCampaignAnalytics(req.params.id, req.query);
            res.json({ success: true, ...analytics });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Overall analytics
    app.get('/api/ads/analytics', adminOnly, async (req, res) => {
        try {
            const analytics = await adService.getOverallAnalytics(req.query);
            res.json({ success: true, ...analytics });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return app;
}

// =============================================================================
// USAGE EXAMPLE
// =============================================================================

/*
// In your BioDocs.ai backend:

import { PrismaClient } from '@prisma/client';
import { AdService, createAdRoutes } from './ads-integration-prisma';

const prisma = new PrismaClient();
const adService = new AdService(prisma);

// Add routes
createAdRoutes(app, adService);

// When user joins a meeting:
app.post('/api/meetings/join', async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    const room = await prisma.streamingRoom.findUnique({ where: { id: req.body.roomId } });
    
    const meetingData = await adService.generateMeetingUrlWithAd(
        { roomId: room.roomCode, isPresenter: room.hostId === user.id },
        user,
        room
    );
    
    res.json(meetingData);
});

// Create a campaign (admin):
const campaign = await adService.createCampaign({
    sponsorName: 'XXXX Pharma',
    message: 'New cardiac medication available',
    url: 'https://xxxxpharma.com/cardiac',
    ctaText: 'Learn More',
    targeting: {
        specialties: ['cardiology', 'internal-medicine'],
        locations: ['india', 'usa'],
        roomTypes: ['consultation', 'live'],
    },
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    budget: 10000,
    costPerImpression: 0.01,
    costPerClick: 0.10,
    approved: true,
});
*/

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
    AdService,
    createAdRoutes,
    CONFIG,
};
