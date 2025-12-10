'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Video,
  Clock,
  Eye,
  MousePointer,
  Globe,
  Smartphone,
  Monitor,
  Calendar,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Zap,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  userGrowth: { date: string; count: number }[];
  documentStats: { type: string; count: number }[];
  featureUsage: { feature: string; usage: number; change: number }[];
  topPages: { page: string; views: number; avgTime: number }[];
  conversionFunnel: { step: string; count: number; rate: number }[];
  retentionData: { week: string; rate: number }[];
}

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  changeType: 'increase' | 'decrease';
  icon: any;
  color: string;
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

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const startDate = subDays(new Date(), days);

      // Fetch user growth data
      const { data: users } = await supabase
        .from('User')
        .select('createdAt')
        .gte('createdAt', startDate.toISOString())
        .order('createdAt', { ascending: true });

      // Group users by date
      const userGrowth = eachDayOfInterval({
        start: startDate,
        end: new Date(),
      }).map((date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const count = users?.filter(
          (u) => format(new Date(u.createdAt), 'yyyy-MM-dd') === dateStr
        ).length || 0;
        return { date: dateStr, count };
      });

      // Fetch document stats
      const { data: documents } = await supabase
        .from('pdf_documents')
        .select('status')
        .gte('createdAt', startDate.toISOString());

      const documentStats = [
        { type: 'Processed', count: documents?.filter((d) => d.status === 'processed').length || 0 },
        { type: 'Pending', count: documents?.filter((d) => d.status === 'pending').length || 0 },
        { type: 'Failed', count: documents?.filter((d) => d.status === 'error').length || 0 },
      ];

      // Feature usage (simulated data - would need actual tracking)
      const featureUsage = [
        { feature: 'PDF Chat', usage: 78, change: 12 },
        { feature: 'Presentations', usage: 65, change: 8 },
        { feature: 'Deep Research', usage: 54, change: 15 },
        { feature: 'Video Streaming', usage: 42, change: 23 },
        { feature: 'Literature Review', usage: 38, change: -5 },
        { feature: 'Citation Generator', usage: 31, change: 3 },
      ];

      // Top pages (simulated)
      const topPages = [
        { page: '/dashboard', views: 12450, avgTime: 245 },
        { page: '/pdf-chat', views: 8920, avgTime: 420 },
        { page: '/presentation', views: 6780, avgTime: 380 },
        { page: '/deep-research', views: 5430, avgTime: 520 },
        { page: '/video-streaming', views: 4210, avgTime: 890 },
      ];

      // Conversion funnel (simulated)
      const conversionFunnel = [
        { step: 'Visitors', count: 50000, rate: 100 },
        { step: 'Sign Ups', count: 8500, rate: 17 },
        { step: 'Activated', count: 5100, rate: 60 },
        { step: 'Engaged', count: 2550, rate: 50 },
        { step: 'Converted', count: 510, rate: 20 },
      ];

      // Retention data (simulated)
      const retentionData = [
        { week: 'Week 1', rate: 100 },
        { week: 'Week 2', rate: 68 },
        { week: 'Week 3', rate: 52 },
        { week: 'Week 4', rate: 45 },
        { week: 'Week 5', rate: 41 },
        { week: 'Week 6', rate: 38 },
        { week: 'Week 7', rate: 36 },
        { week: 'Week 8', rate: 35 },
      ];

      setAnalyticsData({
        userGrowth,
        documentStats,
        featureUsage,
        topPages,
        conversionFunnel,
        retentionData,
      });

      // Calculate metrics
      const totalNewUsers = userGrowth.reduce((sum, d) => sum + d.count, 0);
      const totalDocs = documents?.length || 0;

      setMetrics([
        {
          title: 'Total Page Views',
          value: '156.2K',
          change: 12.5,
          changeType: 'increase',
          icon: Eye,
          color: 'bg-blue-500/10 text-blue-500',
        },
        {
          title: 'Unique Visitors',
          value: '45.8K',
          change: 8.3,
          changeType: 'increase',
          icon: Users,
          color: 'bg-green-500/10 text-green-500',
        },
        {
          title: 'Avg. Session Duration',
          value: '12m 34s',
          change: 5.2,
          changeType: 'increase',
          icon: Clock,
          color: 'bg-purple-500/10 text-purple-500',
        },
        {
          title: 'Bounce Rate',
          value: '32.4%',
          change: 2.1,
          changeType: 'decrease',
          icon: Target,
          color: 'bg-orange-500/10 text-orange-500',
        },
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const MetricCardComponent = ({ metric }: { metric: MetricCard }) => (
    <motion.div variants={itemVariants}>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
              <p className="text-3xl font-bold">{metric.value}</p>
              <div className="flex items-center gap-1">
                {metric.changeType === 'increase' ? (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-sm font-medium',
                    metric.changeType === 'increase' ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {metric.change}%
                </span>
              </div>
            </div>
            <div className={cn('p-3 rounded-xl', metric.color)}>
              <metric.icon className="w-6 h-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-1/2 mb-4" />
                <div className="h-8 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive platform analytics and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAnalytics} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <MetricCardComponent key={i} metric={metric} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                User Growth
              </CardTitle>
              <CardDescription>New user registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-end gap-1">
                {analyticsData?.userGrowth.slice(-14).map((day, i) => {
                  const maxCount = Math.max(...(analyticsData?.userGrowth.map((d) => d.count) || [1]));
                  const height = (day.count / maxCount) * 100 || 5;
                  return (
                    <div
                      key={i}
                      className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors relative group"
                      style={{ height: `${height}%`, minHeight: '8px' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {day.count} users
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{format(subDays(new Date(), 13), 'MMM d')}</span>
                <span>{format(new Date(), 'MMM d')}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Feature Usage */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Feature Usage
              </CardTitle>
              <CardDescription>Most used platform features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.featureUsage.map((feature, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{feature.feature}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{feature.usage}%</span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            feature.change > 0
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-red-500/10 text-red-500'
                          )}
                        >
                          {feature.change > 0 ? '+' : ''}
                          {feature.change}%
                        </Badge>
                      </div>
                    </div>
                    <Progress value={feature.usage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Conversion Funnel & Retention */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Conversion Funnel
              </CardTitle>
              <CardDescription>User journey from visitor to customer</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData?.conversionFunnel.map((step, i) => {
                  const width = step.rate;
                  return (
                    <div key={i} className="relative">
                      <div
                        className="h-12 bg-primary/20 rounded-lg flex items-center justify-between px-4 transition-all"
                        style={{ width: `${width}%`, minWidth: '200px' }}
                      >
                        <span className="font-medium text-sm">{step.step}</span>
                        <span className="text-sm text-muted-foreground">
                          {step.count.toLocaleString()}
                        </span>
                      </div>
                      {i < (analyticsData?.conversionFunnel.length || 0) - 1 && (
                        <div className="absolute -right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {analyticsData?.conversionFunnel[i + 1].rate}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Retention Curve */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                User Retention
              </CardTitle>
              <CardDescription>Weekly cohort retention rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] flex items-end gap-2">
                {analyticsData?.retentionData.map((week, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-green-500/20 hover:bg-green-500/40 rounded-t transition-colors"
                      style={{ height: `${week.rate * 2}px` }}
                    />
                    <span className="text-xs text-muted-foreground">{week.rate}%</span>
                    <span className="text-xs text-muted-foreground">W{i + 1}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Pages & Traffic Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Top Pages
              </CardTitle>
              <CardDescription>Most visited pages on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.topPages.map((page, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium">{page.page}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {page.views.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(page.avgTime / 60)}m {page.avgTime % 60}s
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Traffic Sources */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Traffic Sources
              </CardTitle>
              <CardDescription>Where your users come from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { source: 'Organic Search', percentage: 42, icon: '🔍' },
                  { source: 'Direct', percentage: 28, icon: '🔗' },
                  { source: 'Social Media', percentage: 18, icon: '📱' },
                  { source: 'Referral', percentage: 8, icon: '🤝' },
                  { source: 'Email', percentage: 4, icon: '📧' },
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{item.icon}</span>
                        <span className="text-sm font-medium">{item.source}</span>
                      </div>
                      <span className="text-sm font-medium">{item.percentage}%</span>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Engagement Metrics */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="w-5 h-5" />
              Engagement Metrics
            </CardTitle>
            <CardDescription>User interaction and engagement data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-3xl font-bold text-primary">4.2</p>
                <p className="text-sm text-muted-foreground">Pages per Session</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-3xl font-bold text-green-500">68%</p>
                <p className="text-sm text-muted-foreground">Returning Users</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-3xl font-bold text-blue-500">2.8</p>
                <p className="text-sm text-muted-foreground">Actions per User</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-3xl font-bold text-purple-500">85%</p>
                <p className="text-sm text-muted-foreground">Feature Adoption</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
