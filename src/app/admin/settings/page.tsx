'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Save,
  Globe,
  Mail,
  Bell,
  Shield,
  Database,
  Palette,
  CreditCard,
  Video,
  FileText,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: any;
}

const settingsSections: SettingsSection[] = [
  { id: 'general', title: 'General', description: 'Basic platform settings', icon: Settings },
  { id: 'users', title: 'Users', description: 'User management settings', icon: Users },
  { id: 'features', title: 'Features', description: 'Feature toggles', icon: Zap },
  { id: 'notifications', title: 'Notifications', description: 'Email and push settings', icon: Bell },
  { id: 'security', title: 'Security', description: 'Security configurations', icon: Shield },
  { id: 'billing', title: 'Billing', description: 'Payment and subscription', icon: CreditCard },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    siteName: 'BioDocs.ai',
    siteDescription: 'AI-powered platform for medical research and documentation',
    supportEmail: 'support@biodocs.ai',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
  });

  // User settings state
  const [userSettings, setUserSettings] = useState({
    defaultCredits: 100,
    maxCreditsPerDay: 500,
    defaultPlan: 'free',
    allowGoogleAuth: true,
    allowEmailAuth: true,
    sessionTimeout: 7,
  });

  // Feature settings state
  const [featureSettings, setFeatureSettings] = useState({
    pdfChat: true,
    presentations: true,
    deepResearch: true,
    videoStreaming: true,
    literatureReview: true,
    citationGenerator: true,
    manuscriptReview: true,
    irbBuilder: true,
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    welcomeEmail: true,
    weeklyDigest: true,
    productUpdates: true,
    securityAlerts: true,
    usageAlerts: true,
    marketingEmails: false,
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    ipWhitelist: '',
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireSpecialChars: true,
    sessionRecording: false,
  });

  // Billing settings state
  const [billingSettings, setBillingSettings] = useState({
    currency: 'USD',
    taxRate: 0,
    trialDays: 14,
    gracePeriodDays: 3,
    autoRenew: true,
    proMonthlyPrice: 29,
    proYearlyPrice: 290,
    enterpriseMonthlyPrice: 99,
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const SettingCard = ({
    title,
    description,
    children,
  }: {
    title: string;
    description?: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-4">
      <div className="flex-1">
        <h4 className="font-medium">{title}</h4>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="md:w-[300px]">{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Platform Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your platform settings and preferences
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
          {settingsSections.map((section) => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
            >
              <section.icon className="w-4 h-4" />
              {section.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Basic platform configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <SettingCard title="Site Name" description="The name of your platform">
                <Input
                  value={generalSettings.siteName}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, siteName: e.target.value })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Site Description" description="A brief description of your platform">
                <Textarea
                  value={generalSettings.siteDescription}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })
                  }
                  rows={3}
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Support Email" description="Email for user support inquiries">
                <Input
                  type="email"
                  value={generalSettings.supportEmail}
                  onChange={(e) =>
                    setGeneralSettings({ ...generalSettings, supportEmail: e.target.value })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard
                title="Maintenance Mode"
                description="Temporarily disable the platform for maintenance"
              >
                <div className="flex items-center gap-2">
                  <Switch
                    checked={generalSettings.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setGeneralSettings({ ...generalSettings, maintenanceMode: checked })
                    }
                  />
                  <Badge variant={generalSettings.maintenanceMode ? 'destructive' : 'secondary'}>
                    {generalSettings.maintenanceMode ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </SettingCard>
              <Separator />

              <SettingCard
                title="Allow Registration"
                description="Allow new users to register"
              >
                <Switch
                  checked={generalSettings.allowRegistration}
                  onCheckedChange={(checked) =>
                    setGeneralSettings({ ...generalSettings, allowRegistration: checked })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard
                title="Require Email Verification"
                description="Users must verify their email before accessing the platform"
              >
                <Switch
                  checked={generalSettings.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    setGeneralSettings({ ...generalSettings, requireEmailVerification: checked })
                  }
                />
              </SettingCard>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Settings */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Settings</CardTitle>
              <CardDescription>Configure user-related settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <SettingCard title="Default Credits" description="Credits given to new users">
                <Input
                  type="number"
                  value={userSettings.defaultCredits}
                  onChange={(e) =>
                    setUserSettings({ ...userSettings, defaultCredits: parseInt(e.target.value) })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Max Credits Per Day" description="Maximum credits a user can earn daily">
                <Input
                  type="number"
                  value={userSettings.maxCreditsPerDay}
                  onChange={(e) =>
                    setUserSettings({ ...userSettings, maxCreditsPerDay: parseInt(e.target.value) })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Default Plan" description="Default subscription plan for new users">
                <Select
                  value={userSettings.defaultPlan}
                  onValueChange={(value) => setUserSettings({ ...userSettings, defaultPlan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </SettingCard>
              <Separator />

              <SettingCard title="Google Authentication" description="Allow users to sign in with Google">
                <Switch
                  checked={userSettings.allowGoogleAuth}
                  onCheckedChange={(checked) =>
                    setUserSettings({ ...userSettings, allowGoogleAuth: checked })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Email Authentication" description="Allow users to sign in with email/password">
                <Switch
                  checked={userSettings.allowEmailAuth}
                  onCheckedChange={(checked) =>
                    setUserSettings({ ...userSettings, allowEmailAuth: checked })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Session Timeout (days)" description="How long until sessions expire">
                <Input
                  type="number"
                  value={userSettings.sessionTimeout}
                  onChange={(e) =>
                    setUserSettings({ ...userSettings, sessionTimeout: parseInt(e.target.value) })
                  }
                />
              </SettingCard>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Settings */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Toggles</CardTitle>
              <CardDescription>Enable or disable platform features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(featureSettings).map(([key, value], index) => (
                <div key={key}>
                  <SettingCard
                    title={key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase())}
                    description={`Enable the ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} feature`}
                  >
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={value}
                        onCheckedChange={(checked) =>
                          setFeatureSettings({ ...featureSettings, [key]: checked })
                        }
                      />
                      <Badge variant={value ? 'default' : 'secondary'}>
                        {value ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </SettingCard>
                  {index < Object.entries(featureSettings).length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure email and push notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(notificationSettings).map(([key, value], index) => (
                <div key={key}>
                  <SettingCard
                    title={key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase())}
                  >
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, [key]: checked })
                      }
                    />
                  </SettingCard>
                  {index < Object.entries(notificationSettings).length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security and access controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <SettingCard
                title="Two-Factor Authentication"
                description="Require 2FA for all admin accounts"
              >
                <Switch
                  checked={securitySettings.twoFactorAuth}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, twoFactorAuth: checked })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Max Login Attempts" description="Lock account after failed attempts">
                <Input
                  type="number"
                  value={securitySettings.maxLoginAttempts}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      maxLoginAttempts: parseInt(e.target.value),
                    })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Minimum Password Length" description="Minimum characters required">
                <Input
                  type="number"
                  value={securitySettings.passwordMinLength}
                  onChange={(e) =>
                    setSecuritySettings({
                      ...securitySettings,
                      passwordMinLength: parseInt(e.target.value),
                    })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard
                title="Require Special Characters"
                description="Passwords must contain special characters"
              >
                <Switch
                  checked={securitySettings.requireSpecialChars}
                  onCheckedChange={(checked) =>
                    setSecuritySettings({ ...securitySettings, requireSpecialChars: checked })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard
                title="IP Whitelist"
                description="Restrict admin access to specific IPs (comma-separated)"
              >
                <Textarea
                  value={securitySettings.ipWhitelist}
                  onChange={(e) =>
                    setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })
                  }
                  placeholder="e.g., 192.168.1.1, 10.0.0.1"
                  rows={2}
                />
              </SettingCard>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Settings */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Configure payment and subscription settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <SettingCard title="Currency" description="Default currency for payments">
                <Select
                  value={billingSettings.currency}
                  onValueChange={(value) =>
                    setBillingSettings({ ...billingSettings, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="INR">INR (₹)</SelectItem>
                  </SelectContent>
                </Select>
              </SettingCard>
              <Separator />

              <SettingCard title="Trial Period (days)" description="Free trial duration for new users">
                <Input
                  type="number"
                  value={billingSettings.trialDays}
                  onChange={(e) =>
                    setBillingSettings({ ...billingSettings, trialDays: parseInt(e.target.value) })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Grace Period (days)" description="Days after payment failure before suspension">
                <Input
                  type="number"
                  value={billingSettings.gracePeriodDays}
                  onChange={(e) =>
                    setBillingSettings({
                      ...billingSettings,
                      gracePeriodDays: parseInt(e.target.value),
                    })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Auto-Renew Subscriptions" description="Automatically renew subscriptions">
                <Switch
                  checked={billingSettings.autoRenew}
                  onCheckedChange={(checked) =>
                    setBillingSettings({ ...billingSettings, autoRenew: checked })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Pro Monthly Price" description="Monthly price for Pro plan">
                <Input
                  type="number"
                  value={billingSettings.proMonthlyPrice}
                  onChange={(e) =>
                    setBillingSettings({
                      ...billingSettings,
                      proMonthlyPrice: parseInt(e.target.value),
                    })
                  }
                />
              </SettingCard>
              <Separator />

              <SettingCard title="Pro Yearly Price" description="Yearly price for Pro plan">
                <Input
                  type="number"
                  value={billingSettings.proYearlyPrice}
                  onChange={(e) =>
                    setBillingSettings({
                      ...billingSettings,
                      proYearlyPrice: parseInt(e.target.value),
                    })
                  }
                />
              </SettingCard>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
