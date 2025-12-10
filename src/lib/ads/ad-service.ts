/**
 * BioDocs.ai Ad Service
 * 
 * Manages sponsored ads for video meetings on video.biodocs.ai (MiroTalk SFU)
 * Handles campaign management, targeting, impression tracking, and analytics
 */

import { db } from "@/server/db";
import type { AdCampaign, AdImpression, Prisma } from "@prisma/client";

// =============================================================================
// TYPES
// =============================================================================

export interface AdTargeting {
  specialties?: string[];
  locations?: string[];
  roomTypes?: string[];
  userIds?: string[];
  userEmails?: string[];
}

export interface CreateCampaignInput {
  sponsorName: string;
  sponsorLogo?: string;
  message?: string;
  url: string;
  ctaText?: string;
  targeting?: AdTargeting;
  startDate: Date | string;
  endDate: Date | string;
  budget?: number;
  costPerImpression?: number;
  costPerClick?: number;
  active?: boolean;
  approved?: boolean;
  createdBy?: string;
}

export interface UpdateCampaignInput {
  sponsorName?: string;
  sponsorLogo?: string;
  message?: string;
  url?: string;
  ctaText?: string;
  targeting?: AdTargeting;
  startDate?: Date | string;
  endDate?: Date | string;
  budget?: number;
  costPerImpression?: number;
  costPerClick?: number;
  active?: boolean;
  approved?: boolean;
}

export interface UserContext {
  userId?: string;
  userEmail?: string;
  specialty?: string;
  location?: string;
  roomType?: string;
  roomId?: string;
}

export interface SelectedAd {
  sponsor: string;
  sponsorLogo: string | null;
  message: string | null;
  url: string;
  ctaText: string;
  impressionId: string;
  campaignId: string;
  trackingUrl: string;
}

export interface CampaignFilters {
  active?: boolean;
  approved?: boolean;
  sponsorName?: string;
}

export interface DateRange {
  from?: Date | string;
  to?: Date | string;
}

export interface CampaignAnalytics {
  campaign: AdCampaign | null;
  totalImpressions: number;
  totalClicks: number;
  ctr: string;
  bySpecialty: Array<{ userSpecialty: string | null; _count: number }>;
  byLocation: Array<{ userLocation: string | null; _count: number }>;
}

export interface OverallAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  overallCtr: string;
  totalSpent: number;
}

// =============================================================================
// AD SERVICE CLASS
// =============================================================================

class AdService {
  private trackingBaseUrl: string;

  constructor() {
    this.trackingBaseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://biodocs.ai";
  }

  // ===========================================================================
  // CAMPAIGN MANAGEMENT
  // ===========================================================================

  /**
   * Create a new ad campaign
   */
  async createCampaign(data: CreateCampaignInput): Promise<AdCampaign> {
    return db.adCampaign.create({
      data: {
        sponsorName: data.sponsorName,
        sponsorLogo: data.sponsorLogo,
        message: data.message,
        url: data.url,
        ctaText: data.ctaText || "Learn More",
        targeting: data.targeting as Prisma.JsonObject || {},
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
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
  async updateCampaign(id: string, data: UpdateCampaignInput): Promise<AdCampaign> {
    const updateData: Prisma.AdCampaignUpdateInput = {};

    if (data.sponsorName !== undefined) updateData.sponsorName = data.sponsorName;
    if (data.sponsorLogo !== undefined) updateData.sponsorLogo = data.sponsorLogo;
    if (data.message !== undefined) updateData.message = data.message;
    if (data.url !== undefined) updateData.url = data.url;
    if (data.ctaText !== undefined) updateData.ctaText = data.ctaText;
    if (data.targeting !== undefined) updateData.targeting = data.targeting as Prisma.JsonObject;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
    if (data.budget !== undefined) updateData.budget = data.budget;
    if (data.costPerImpression !== undefined) updateData.costPerImpression = data.costPerImpression;
    if (data.costPerClick !== undefined) updateData.costPerClick = data.costPerClick;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.approved !== undefined) updateData.approved = data.approved;

    return db.adCampaign.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(id: string): Promise<AdCampaign> {
    return db.adCampaign.delete({
      where: { id },
    });
  }

  /**
   * Get a campaign by ID
   */
  async getCampaign(id: string): Promise<AdCampaign | null> {
    return db.adCampaign.findUnique({
      where: { id },
    });
  }

  /**
   * Get all campaigns with optional filters
   */
  async getCampaigns(filters: CampaignFilters = {}): Promise<AdCampaign[]> {
    const where: Prisma.AdCampaignWhereInput = {};

    if (filters.active !== undefined) where.active = filters.active;
    if (filters.approved !== undefined) where.approved = filters.approved;
    if (filters.sponsorName) {
      where.sponsorName = { contains: filters.sponsorName, mode: "insensitive" };
    }

    return db.adCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get active campaigns (approved, within date range)
   */
  async getActiveCampaigns(): Promise<AdCampaign[]> {
    const now = new Date();
    return db.adCampaign.findMany({
      where: {
        active: true,
        approved: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
  }

  /**
   * Get campaign with analytics
   */
  async getCampaignWithAnalytics(id: string) {
    const campaign = await db.adCampaign.findUnique({
      where: { id },
      include: {
        AdImpressions: {
          take: 100,
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: { AdImpressions: true },
        },
      },
    });

    if (!campaign) return null;

    const ctr =
      campaign.impressions > 0
        ? (campaign.clicks / campaign.impressions) * 100
        : 0;

    return {
      ...campaign,
      ctr: ctr.toFixed(2),
      totalImpressions: campaign.impressions,
      totalClicks: campaign.clicks,
    };
  }

  // ===========================================================================
  // AD TARGETING & SELECTION
  // ===========================================================================

  /**
   * Select the best ad for a user/room context
   * This is the main method called when generating meeting URLs
   */
  async selectTargetedAd(context: UserContext): Promise<SelectedAd | null> {
    const { userId, userEmail, specialty, location, roomType, roomId } = context;

    const activeCampaigns = await this.getActiveCampaigns();

    if (activeCampaigns.length === 0) {
      return null;
    }

    // Score each campaign based on targeting match
    const scoredCampaigns = activeCampaigns.map((campaign) => {
      let score = 0;
      const targeting = (campaign.targeting as AdTargeting) || {};

      // Specific user targeting (highest priority)
      if (
        targeting.userIds?.includes(userId || "") ||
        targeting.userEmails?.includes(userEmail || "")
      ) {
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
        trackingUrl: `${this.trackingBaseUrl}/api/ads/track`,
      };
    }

    return null;
  }

  // ===========================================================================
  // IMPRESSION & CLICK TRACKING
  // ===========================================================================

  /**
   * Create an impression record
   */
  async createImpression(data: {
    campaignId: string;
    roomId?: string;
    userId?: string;
    userSpecialty?: string;
    userLocation?: string;
    roomType?: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<AdImpression> {
    // Create impression
    const impression = await db.adImpression.create({
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
    const campaign = await db.adCampaign.findUnique({
      where: { id: data.campaignId },
      select: { costPerImpression: true },
    });

    await db.adCampaign.update({
      where: { id: data.campaignId },
      data: {
        impressions: { increment: 1 },
        spent: { increment: campaign?.costPerImpression || 0 },
      },
    });

    return impression;
  }

  /**
   * Track a click event
   */
  async trackClick(impressionId: string): Promise<{ success: boolean; message?: string }> {
    const impression = await db.adImpression.findUnique({
      where: { id: impressionId },
    });

    if (!impression) {
      return { success: false, message: "Impression not found" };
    }

    if (impression.clicked) {
      return { success: false, message: "Already clicked" };
    }

    // Update impression
    await db.adImpression.update({
      where: { id: impressionId },
      data: {
        clicked: true,
        clickedAt: new Date(),
      },
    });

    // Update campaign click count
    const campaign = await db.adCampaign.findUnique({
      where: { id: impression.campaignId },
      select: { costPerClick: true },
    });

    await db.adCampaign.update({
      where: { id: impression.campaignId },
      data: {
        clicks: { increment: 1 },
        spent: { increment: campaign?.costPerClick || 0 },
      },
    });

    return { success: true };
  }

  /**
   * Track dismiss event
   */
  async trackDismiss(impressionId: string): Promise<{ success: boolean }> {
    await db.adImpression.update({
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
  async trackEvent(eventData: {
    event: string;
    impressionId: string;
  }): Promise<{ success: boolean; message?: string }> {
    const { event, impressionId } = eventData;

    switch (event) {
      case "click":
        return this.trackClick(impressionId);
      case "dismiss":
        return this.trackDismiss(impressionId);
      case "impression":
        // Already tracked when ad was selected
        return { success: true };
      default:
        return { success: false, message: "Unknown event type" };
    }
  }

  // ===========================================================================
  // ANALYTICS
  // ===========================================================================

  /**
   * Get analytics for a campaign
   */
  async getCampaignAnalytics(
    campaignId: string,
    dateRange: DateRange = {}
  ): Promise<CampaignAnalytics> {
    const where: Prisma.AdImpressionWhereInput = { campaignId };

    if (dateRange.from) {
      where.createdAt = { gte: new Date(dateRange.from) };
    }
    if (dateRange.to) {
      where.createdAt = { ...where.createdAt, lte: new Date(dateRange.to) };
    }

    const [campaign, impressions, clickedImpressions] = await Promise.all([
      db.adCampaign.findUnique({ where: { id: campaignId } }),
      db.adImpression.count({ where }),
      db.adImpression.count({ where: { ...where, clicked: true } }),
    ]);

    // Group by specialty
    const bySpecialty = await db.adImpression.groupBy({
      by: ["userSpecialty"],
      where,
      _count: true,
    });

    // Group by location
    const byLocation = await db.adImpression.groupBy({
      by: ["userLocation"],
      where,
      _count: true,
    });

    return {
      campaign,
      totalImpressions: impressions,
      totalClicks: clickedImpressions,
      ctr:
        impressions > 0
          ? ((clickedImpressions / impressions) * 100).toFixed(2)
          : "0",
      bySpecialty: bySpecialty.filter((s) => s.userSpecialty),
      byLocation: byLocation.filter((l) => l.userLocation),
    };
  }

  /**
   * Get overall ads analytics
   */
  async getOverallAnalytics(dateRange: DateRange = {}): Promise<OverallAnalytics> {
    const where: Prisma.AdImpressionWhereInput = {};

    if (dateRange.from) {
      where.createdAt = { gte: new Date(dateRange.from) };
    }
    if (dateRange.to) {
      where.createdAt = { ...where.createdAt, lte: new Date(dateRange.to) };
    }

    const [
      totalCampaigns,
      activeCampaigns,
      totalImpressions,
      totalClicks,
      totalSpent,
    ] = await Promise.all([
      db.adCampaign.count(),
      db.adCampaign.count({ where: { active: true, approved: true } }),
      db.adImpression.count({ where }),
      db.adImpression.count({ where: { ...where, clicked: true } }),
      db.adCampaign.aggregate({ _sum: { spent: true } }),
    ]);

    return {
      totalCampaigns,
      activeCampaigns,
      totalImpressions,
      totalClicks,
      overallCtr:
        totalImpressions > 0
          ? ((totalClicks / totalImpressions) * 100).toFixed(2)
          : "0",
      totalSpent: totalSpent._sum.spent || 0,
    };
  }
}

// Export singleton instance
export const adService = new AdService();

// Export class for testing
export { AdService };
