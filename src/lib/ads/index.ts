/**
 * BioDocs.ai Ads Module
 * 
 * Exports for ad management and integration
 */

export { adService, AdService } from './ad-service';
export type {
  AdTargeting,
  CreateCampaignInput,
  UpdateCampaignInput,
  UserContext,
  SelectedAd,
  CampaignFilters,
  DateRange,
  CampaignAnalytics,
  OverallAnalytics,
} from './ad-service';
export { checkAdminAccess } from './admin-check';
