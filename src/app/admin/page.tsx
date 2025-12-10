'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  Video,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Eye,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Globe,
  Smartphone,
  Monitor,
  BarChart3,
  PieChart,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  totalDocuments: number;
  totalStreams: number;
  liveStreams: number;
  totalRevenue: number;
  monthlyRevenue: number;
  avgSessionDuration: number;
  pageViews: number;
  bounceRate: number;
}

interface RecentActivity {
  id: string;
  type: 'user_signup' | 'document_created' | 'stream_started' | 'payment';
  description: string;
  timestamp: string;
  metadata?: any;
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const supabase = getBrowserSupabase();
      
      // Fetch user stats
      const { count: totalUsers } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true });

      const today = new Date();
      const startOfToday = startOfDay(today).toISOString();
      const weekAgo = subDays(today, 7).toISOString();
      const monthAgo = subDays(today, 30).toISOString();

      const { count: newUsersToday } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', startOfToday);

      const { count: newUsersThisWeek } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
        .gte('createdAt', weekAgo);

      // Fetch document stats
      const { count: totalDocuments } = await supabase
        .from('pdf_documents')
        .select('*', { count: 'exact', head: true });

      // Fetch stream stats
      const { count: totalStreams } = await supabase
        .from('streaming_rooms')
        .select('*', { count: 'exact', head: true });

      const { count: liveStreams } = await supabase
        .from('streaming_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'live');

      // Fetch payment stats
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, createdAt')
        .eq('status', 'completed');

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const monthlyPayments = payments?.filter(p => 
        new Date(p.createdAt) >= new Date(monthAgo)
      ) || [];
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Calculate active users (users who logged in within last 7 days)
      const { count: activeUsers } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
        .gte('updatedAt', weekAgo);

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        newUsersToday: newUsersToday || 0,
        newUsersThisWeek: newUsersThisWeek || 0,
        totalDocuments: totalDocuments || 0,
        totalStreams: totalStreams || 0,
        liveStreams: liveStreams || 0,
        totalRevenue: totalRevenue / 100, // Convert from cents
        monthlyRevenue: monthlyRevenue / 100,
        avgSessionDuration: 12.5, // Placeholder - would need analytics integration
        pageViews: 45230, // Placeholder
        bounceRate: 32.4, // Placeholder
      });

      // Fetch recent activity
      const { data: recentUsers } = await supabase
        .from('User')
        .select('id, email, name, createdAt')
        .order('createdAt', { ascending: false })
        .limit(5);

      const activities: RecentActivity[] = (recentUsers || []).map(u => ({
        id: u.id,
        type: 'user_signup' as const,
        description: `New user: ${u.name || u.email}`,
        timestamp: u.createdAt,
      }));

      setRecentActivity(activities);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard = ({
    title,
    value,
    change,
    changeType,
    icon: Icon,
    subtitle,
    color = 'primary',
  }: {
    title: string;
    value: string | number;
    change?: number;
    changeType?: 'increase' | 'decrease';
    icon: any;
    subtitle?: string;
    color?: 'primary' | 'green' | 'blue' | 'orange' | 'purple';
  }) => {
    const colorClasses = {
      primary: 'bg-primary/10 text-primary',
      green: 'bg-green-500/10 text-green-500',
      blue: 'bg-blue-500/10 text-blue-500',
      orange: 'bg-orange-500/10 text-orange-500',
      purple: 'bg-purple-500/10 text-purple-500',
    };

    return (
      <motion.div variants={itemVariants}>
        <Card className="relative overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
                {change !== undefined && (
                  <div className="flex items-center gap-1">
                    {changeType === 'increase' ? (
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={cn(
                        'text-sm font-medium',
                        changeType === 'increase' ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {change}%
                    </span>
                    <span className="text-sm text-muted-foreground">vs last period</span>
                  </div>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <div className={cn('p-3 rounded-xl', colorClasses[color])}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

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
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <TabsList>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">This Week</TabsTrigger>
              <TabsTrigger value="month">This Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={stats?.totalUsers.toLocaleString() || '0'}
          change={12.5}
          changeType="increase"
          icon={Users}
          subtitle={`${stats?.newUsersToday || 0} new today`}
          color="primary"
        />
        <StatCard
          title="Active Users"
          value={stats?.activeUsers.toLocaleString() || '0'}
          change={8.2}
          changeType="increase"
          icon={Activity}
          subtitle="Last 7 days"
          color="green"
        />
        <StatCard
          title="Total Documents"
          value={stats?.totalDocuments.toLocaleString() || '0'}
          change={15.3}
          changeType="increase"
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats?.monthlyRevenue.toLocaleString() || '0'}`}
          change={23.1}
          changeType="increase"
          icon={DollarSign}
          subtitle={`$${stats?.totalRevenue.toLocaleString() || '0'} total`}
          color="purple"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Video Streams"
          value={stats?.totalStreams || 0}
          icon={Video}
          subtitle={`${stats?.liveStreams || 0} live now`}
          color="orange"
        />
        <StatCard
          title="Page Views"
          value={stats?.pageViews.toLocaleString() || '0'}
          change={5.7}
          changeType="increase"
          icon={Eye}
          color="blue"
        />
        <StatCard
          title="Avg. Session"
          value={`${stats?.avgSessionDuration || 0} min`}
          change={2.3}
          changeType="increase"
          icon={Clock}
          color="green"
        />
        <StatCard
          title="Bounce Rate"
          value={`${stats?.bounceRate || 0}%`}
          change={1.2}
          changeType="decrease"
          icon={TrendingDown}
          color="primary"
        />
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Growth Chart Placeholder */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                User Growth
              </CardTitle>
              <CardDescription>New user registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Chart visualization will be displayed here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Integrate with Recharts or Chart.js
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={itemVariants}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest platform events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 pb-3 border-b last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Platform Health */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Platform Health
            </CardTitle>
            <CardDescription>System status and performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Server Uptime</span>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                    99.9%
                  </Badge>
                </div>
                <Progress value={99.9} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">API Response Time</span>
                  <Badge variant="secondary">124ms avg</Badge>
                </div>
                <Progress value={85} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Database Load</span>
                  <Badge variant="secondary">32%</Badge>
                </div>
                <Progress value={32} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Device & Traffic Sources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="w-5 h-5" />
                Traffic by Device
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Desktop</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={58} className="w-24 h-2" />
                    <span className="text-sm font-medium w-12 text-right">58%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Mobile</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={35} className="w-24 h-2" />
                    <span className="text-sm font-medium w-12 text-right">35%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Tablet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={7} className="w-24 h-2" />
                    <span className="text-sm font-medium w-12 text-right">7%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Top Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { country: 'India', percentage: 45, flag: '🇮🇳' },
                  { country: 'United States', percentage: 28, flag: '🇺🇸' },
                  { country: 'United Kingdom', percentage: 12, flag: '🇬🇧' },
                  { country: 'Germany', percentage: 8, flag: '🇩🇪' },
                  { country: 'Others', percentage: 7, flag: '🌍' },
                ].map((item) => (
                  <div key={item.country} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.flag}</span>
                      <span className="text-sm">{item.country}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={item.percentage} className="w-24 h-2" />
                      <span className="text-sm font-medium w-12 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
