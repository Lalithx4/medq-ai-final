'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  MousePointer,
  DollarSign,
  Calendar,
  Target,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  ExternalLink,
  TrendingUp,
  Users,
  BarChart3,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AdCampaign {
  id: string;
  sponsorName: string;
  sponsorLogo: string | null;
  message: string | null;
  url: string;
  ctaText: string;
  targeting: {
    specialties?: string[];
    locations?: string[];
    roomTypes?: string[];
    userIds?: string[];
    userEmails?: string[];
  } | null;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  costPerImpression: number;
  costPerClick: number;
  impressions: number;
  clicks: number;
  active: boolean;
  approved: boolean;
  createdAt: string;
}

interface OverallAnalytics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalImpressions: number;
  totalClicks: number;
  overallCtr: string;
  totalSpent: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AdsManagementPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [analytics, setAnalytics] = useState<OverallAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'approved' | 'pending'>('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    sponsorName: '',
    sponsorLogo: '',
    message: '',
    url: '',
    ctaText: 'Learn More',
    startDate: '',
    endDate: '',
    budget: 0,
    costPerImpression: 0,
    costPerClick: 0,
    active: true,
    approved: false,
    targeting: {
      specialties: [] as string[],
      locations: [] as string[],
      roomTypes: [] as string[],
    },
  });

  useEffect(() => {
    fetchCampaigns();
    fetchAnalytics();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/ads/campaigns');
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to fetch campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/ads/analytics');
      const data = await response.json();
      if (data.success) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleCreateCampaign = async () => {
    try {
      const response = await fetch('/api/ads/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Campaign created successfully');
        setShowCreateDialog(false);
        resetForm();
        fetchCampaigns();
        fetchAnalytics();
      } else {
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handleUpdateCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      const response = await fetch(`/api/ads/campaigns/${selectedCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Campaign updated successfully');
        setShowEditDialog(false);
        setSelectedCampaign(null);
        resetForm();
        fetchCampaigns();
        fetchAnalytics();
      } else {
        toast.error(data.error || 'Failed to update campaign');
      }
    } catch (error) {
      console.error('Error updating campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;
    try {
      const response = await fetch(`/api/ads/campaigns/${selectedCampaign.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Campaign deleted successfully');
        setShowDeleteDialog(false);
        setSelectedCampaign(null);
        fetchCampaigns();
        fetchAnalytics();
      } else {
        toast.error(data.error || 'Failed to delete campaign');
      }
    } catch (error) {
      console.error('Error deleting campaign:', error);
      toast.error('Failed to delete campaign');
    }
  };

  const handleToggleActive = async (campaign: AdCampaign) => {
    try {
      const response = await fetch(`/api/ads/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !campaign.active }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Campaign ${campaign.active ? 'deactivated' : 'activated'}`);
        fetchCampaigns();
      }
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast.error('Failed to update campaign');
    }
  };

  const handleToggleApproval = async (campaign: AdCampaign) => {
    try {
      const response = await fetch(`/api/ads/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved: !campaign.approved }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Campaign ${campaign.approved ? 'unapproved' : 'approved'}`);
        fetchCampaigns();
        fetchAnalytics();
      }
    } catch (error) {
      console.error('Error toggling approval:', error);
      toast.error('Failed to update campaign');
    }
  };

  const resetForm = () => {
    setFormData({
      sponsorName: '',
      sponsorLogo: '',
      message: '',
      url: '',
      ctaText: 'Learn More',
      startDate: '',
      endDate: '',
      budget: 0,
      costPerImpression: 0,
      costPerClick: 0,
      active: true,
      approved: false,
      targeting: {
        specialties: [],
        locations: [],
        roomTypes: [],
      },
    });
  };

  const openEditDialog = (campaign: AdCampaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      sponsorName: campaign.sponsorName,
      sponsorLogo: campaign.sponsorLogo || '',
      message: campaign.message || '',
      url: campaign.url,
      ctaText: campaign.ctaText,
      startDate: campaign.startDate.split('T')[0] || '',
      endDate: campaign.endDate.split('T')[0] || '',
      budget: campaign.budget,
      costPerImpression: campaign.costPerImpression,
      costPerClick: campaign.costPerClick,
      active: campaign.active,
      approved: campaign.approved,
      targeting: {
        specialties: campaign.targeting?.specialties || [],
        locations: campaign.targeting?.locations || [],
        roomTypes: campaign.targeting?.roomTypes || [],
      },
    });
    setShowEditDialog(true);
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const matchesSearch = campaign.sponsorName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && campaign.active) ||
      (statusFilter === 'inactive' && !campaign.active);
    const matchesApproval =
      approvalFilter === 'all' ||
      (approvalFilter === 'approved' && campaign.approved) ||
      (approvalFilter === 'pending' && !campaign.approved);
    return matchesSearch && matchesStatus && matchesApproval;
  });

  const getCampaignStatus = (campaign: AdCampaign) => {
    const now = new Date();
    const start = new Date(campaign.startDate);
    const end = new Date(campaign.endDate);

    if (!campaign.active) return { label: 'Inactive', variant: 'secondary' as const };
    if (!campaign.approved) return { label: 'Pending Approval', variant: 'outline' as const };
    if (now < start) return { label: 'Scheduled', variant: 'default' as const };
    if (now > end) return { label: 'Ended', variant: 'secondary' as const };
    return { label: 'Running', variant: 'default' as const };
  };

  const calculateCTR = (impressions: number, clicks: number) => {
    if (impressions === 0) return '0.00';
    return ((clicks / impressions) * 100).toFixed(2);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ad Management</h1>
          <p className="text-muted-foreground">
            Manage sponsored ads for video meetings on video.biodocs.ai
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Analytics Overview */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalCampaigns || 0}</div>
            <p className="text-xs text-muted-foreground">
              {analytics?.activeCampaigns || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalImpressions?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Ads shown to users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.totalClicks?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              CTR: {analytics?.overallCtr || '0.00'}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${analytics?.totalSpent?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">Across all campaigns</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Campaigns Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaigns</CardTitle>
                <CardDescription>
                  {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sponsors..."
                    className="pl-8 w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={approvalFilter} onValueChange={(v: any) => setApprovalFilter(v)}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Approval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredCampaigns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Megaphone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No campaigns found</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setShowCreateDialog(true)}
                >
                  Create your first campaign
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Spent</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign) => {
                    const status = getCampaignStatus(campaign);
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {campaign.sponsorLogo ? (
                              <img
                                src={campaign.sponsorLogo}
                                alt={campaign.sponsorName}
                                className="w-8 h-8 rounded object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                <Megaphone className="w-4 h-4 text-primary" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{campaign.sponsorName}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {campaign.message || campaign.url}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={status.variant}>{status.label}</Badge>
                            {!campaign.approved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={() => handleToggleApproval(campaign)}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(new Date(campaign.startDate), 'MMM d, yyyy')}</p>
                            <p className="text-muted-foreground">
                              to {format(new Date(campaign.endDate), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {campaign.clicks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {calculateCTR(campaign.impressions, campaign.clicks)}%
                        </TableCell>
                        <TableCell className="text-right">
                          ${campaign.spent.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditDialog(campaign)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(campaign)}>
                                {campaign.active ? (
                                  <>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Deactivate
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Activate
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => window.open(campaign.url, '_blank')}
                              >
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Visit URL
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedCampaign(campaign);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create Campaign Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Ad Campaign</DialogTitle>
            <DialogDescription>
              Create a new sponsored ad campaign for video meetings
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sponsorName">Sponsor Name *</Label>
                <Input
                  id="sponsorName"
                  value={formData.sponsorName}
                  onChange={(e) => setFormData({ ...formData, sponsorName: e.target.value })}
                  placeholder="e.g., Pfizer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sponsorLogo">Logo URL</Label>
                <Input
                  id="sponsorLogo"
                  value={formData.sponsorLogo}
                  onChange={(e) => setFormData({ ...formData, sponsorLogo: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Ad Message</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Your promotional message..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="url">Destination URL *</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ctaText">CTA Button Text</Label>
                <Input
                  id="ctaText"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                  placeholder="Learn More"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpi">Cost per Impression ($)</Label>
                <Input
                  id="cpi"
                  type="number"
                  step="0.001"
                  value={formData.costPerImpression}
                  onChange={(e) => setFormData({ ...formData, costPerImpression: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpc">Cost per Click ($)</Label>
                <Input
                  id="cpc"
                  type="number"
                  step="0.01"
                  value={formData.costPerClick}
                  onChange={(e) => setFormData({ ...formData, costPerClick: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Targeting (comma-separated)</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Specialties</Label>
                  <Input
                    placeholder="cardiology, oncology"
                    value={formData.targeting.specialties.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targeting: {
                          ...formData.targeting,
                          specialties: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Locations</Label>
                  <Input
                    placeholder="india, usa"
                    value={formData.targeting.locations.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targeting: {
                          ...formData.targeting,
                          locations: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Room Types</Label>
                  <Input
                    placeholder="consultation, live"
                    value={formData.targeting.roomTypes.join(', ')}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        targeting: {
                          ...formData.targeting,
                          roomTypes: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="approved"
                  checked={formData.approved}
                  onCheckedChange={(checked) => setFormData({ ...formData, approved: checked })}
                />
                <Label htmlFor="approved">Approved</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCampaign}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Campaign Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>Update campaign details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Same form fields as create dialog */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sponsorName">Sponsor Name *</Label>
                <Input
                  id="edit-sponsorName"
                  value={formData.sponsorName}
                  onChange={(e) => setFormData({ ...formData, sponsorName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-sponsorLogo">Logo URL</Label>
                <Input
                  id="edit-sponsorLogo"
                  value={formData.sponsorLogo}
                  onChange={(e) => setFormData({ ...formData, sponsorLogo: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-message">Ad Message</Label>
              <Textarea
                id="edit-message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-url">Destination URL *</Label>
                <Input
                  id="edit-url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ctaText">CTA Button Text</Label>
                <Input
                  id="edit-ctaText"
                  value={formData.ctaText}
                  onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Start Date *</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">End Date *</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-budget">Budget ($)</Label>
                <Input
                  id="edit-budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cpi">Cost per Impression ($)</Label>
                <Input
                  id="edit-cpi"
                  type="number"
                  step="0.001"
                  value={formData.costPerImpression}
                  onChange={(e) => setFormData({ ...formData, costPerImpression: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-cpc">Cost per Click ($)</Label>
                <Input
                  id="edit-cpc"
                  type="number"
                  step="0.01"
                  value={formData.costPerClick}
                  onChange={(e) => setFormData({ ...formData, costPerClick: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="edit-active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-approved"
                  checked={formData.approved}
                  onCheckedChange={(checked) => setFormData({ ...formData, approved: checked })}
                />
                <Label htmlFor="edit-approved">Approved</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCampaign}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Campaign</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the campaign &quot;{selectedCampaign?.sponsorName}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCampaign}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
