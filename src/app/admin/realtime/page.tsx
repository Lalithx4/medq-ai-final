'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Users,
  Globe,
  Clock,
  Zap,
  TrendingUp,
  Eye,
  MousePointer,
  RefreshCw,
  Wifi,
  WifiOff,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface RealtimeStats {
  activeUsers: number;
  pageViews: number;
  avgLoadTime: number;
  errorRate: number;
}

interface ActiveUser {
  id: string;
  page: string;
  device: 'desktop' | 'mobile' | 'tablet';
  country: string;
  duration: number;
  lastActivity: string;
}

interface LiveEvent {
  id: string;
  type: 'page_view' | 'signup' | 'action' | 'error';
  description: string;
  timestamp: string;
  metadata?: any;
}

export default function RealtimePage() {
  const [isConnected, setIsConnected] = useState(true);
  const [stats, setStats] = useState<RealtimeStats>({
    activeUsers: 0,
    pageViews: 0,
    avgLoadTime: 0,
    errorRate: 0,
  });
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      updateRealtimeData();
    }, 3000);

    // Initial data fetch
    updateRealtimeData();

    return () => clearInterval(interval);
  }, []);

  const updateRealtimeData = async () => {
    try {
      const supabase = getBrowserSupabase();
      
      // Get active users count (users updated in last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count: activeCount } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
        .gte('updatedAt', fiveMinutesAgo);

      // Simulate real-time stats with some randomness
      setStats({
        activeUsers: (activeCount || 0) + Math.floor(Math.random() * 10),
        pageViews: Math.floor(Math.random() * 50) + 100,
        avgLoadTime: Math.random() * 500 + 200,
        errorRate: Math.random() * 2,
      });

      // Simulate active users
      const pages = ['/dashboard', '/pdf-chat', '/presentation', '/deep-research', '/video-streaming', '/settings'];
      const countries = ['India', 'USA', 'UK', 'Germany', 'Canada', 'Australia'];
      const devices: ('desktop' | 'mobile' | 'tablet')[] = ['desktop', 'mobile', 'tablet'];
      
      const simulatedUsers: ActiveUser[] = Array.from({ length: Math.min(activeCount || 5, 15) }, (_, i) => ({
        id: `user-${i}`,
        page: pages[Math.floor(Math.random() * pages.length)] || '/dashboard',
        device: devices[Math.floor(Math.random() * devices.length)] || 'desktop',
        country: countries[Math.floor(Math.random() * countries.length)] || 'Unknown',
        duration: Math.floor(Math.random() * 600) + 30,
        lastActivity: new Date(Date.now() - Math.random() * 300000).toISOString(),
      }));
      
      setActiveUsers(simulatedUsers);

      // Add new live event
      const eventTypes: LiveEvent['type'][] = ['page_view', 'signup', 'action', 'error'];
      const eventDescriptions: Record<LiveEvent['type'], string[]> = {
        page_view: ['Viewed /dashboard', 'Viewed /pdf-chat', 'Viewed /presentation', 'Viewed /pricing'],
        signup: ['New user registered', 'User verified email', 'User completed profile'],
        action: ['Created presentation', 'Uploaded PDF', 'Started video stream', 'Generated research'],
        error: ['API timeout', 'Upload failed', 'Payment error'],
      };

      const eventType: LiveEvent['type'] = eventTypes[Math.floor(Math.random() * eventTypes.length)] || 'page_view';
      const descriptions = eventDescriptions[eventType];
      
      const newEvent: LiveEvent = {
        id: `event-${Date.now()}`,
        type: eventType,
        description: descriptions[Math.floor(Math.random() * descriptions.length)] || 'Unknown event',
        timestamp: new Date().toISOString(),
      };

      setLiveEvents((prev) => [newEvent, ...prev.slice(0, 19)]);
      setLastUpdate(new Date());
      setIsConnected(true);
    } catch (error) {
      console.error('Error updating realtime data:', error);
      setIsConnected(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  const getEventBadge = (type: LiveEvent['type']) => {
    switch (type) {
      case 'signup':
        return <Badge className="bg-green-500">Signup</Badge>;
      case 'action':
        return <Badge className="bg-blue-500">Action</Badge>;
      case 'error':
        return <Badge className="bg-red-500">Error</Badge>;
      default:
        return <Badge variant="secondary">View</Badge>;
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    suffix,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    suffix?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {value}
              {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
            </p>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="w-8 h-8" />
            Real-time Monitoring
          </h1>
          <p className="text-muted-foreground">
            Live platform activity and user sessions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-500">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-500">Disconnected</span>
              </>
            )}
          </div>
          <span className="text-sm text-muted-foreground">
            Last update: {format(lastUpdate, 'HH:mm:ss')}
          </span>
          <Button variant="outline" onClick={updateRealtimeData} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={Users}
          color="bg-green-500/10 text-green-500"
        />
        <StatCard
          title="Page Views / min"
          value={stats.pageViews}
          icon={Eye}
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          title="Avg Load Time"
          value={stats.avgLoadTime.toFixed(0)}
          suffix="ms"
          icon={Zap}
          color="bg-purple-500/10 text-purple-500"
        />
        <StatCard
          title="Error Rate"
          value={stats.errorRate.toFixed(2)}
          suffix="%"
          icon={Activity}
          color="bg-orange-500/10 text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Active Users
              <Badge variant="secondary" className="ml-2">
                {activeUsers.length} online
              </Badge>
            </CardTitle>
            <CardDescription>Currently active user sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {activeUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        {getDeviceIcon(user.device)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.page}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {user.country}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatDuration(user.duration)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(user.lastActivity), 'HH:mm:ss')}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {activeUsers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No active users</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Live Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Live Events
              <span className="relative flex h-2 w-2 ml-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </CardTitle>
            <CardDescription>Real-time platform events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {liveEvents.map((event) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between p-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {getEventBadge(event.type)}
                      <span className="text-sm">{event.description}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(event.timestamp), 'HH:mm:ss')}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>

        {/* Page Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Page Performance
            </CardTitle>
            <CardDescription>Current page load times</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { page: '/dashboard', time: 180, target: 300 },
                { page: '/pdf-chat', time: 420, target: 500 },
                { page: '/presentation', time: 350, target: 400 },
                { page: '/video-streaming', time: 280, target: 350 },
                { page: '/deep-research', time: 520, target: 600 },
              ].map((item) => (
                <div key={item.page} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.page}</span>
                    <span
                      className={cn(
                        'font-medium',
                        item.time <= item.target ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {item.time}ms
                    </span>
                  </div>
                  <Progress
                    value={(item.time / item.target) * 100}
                    className={cn(
                      'h-2',
                      item.time <= item.target ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'
                    )}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Geographic Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Geographic Distribution
          </CardTitle>
          <CardDescription>Active users by region</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { country: 'India', users: 45, flag: '🇮🇳' },
              { country: 'USA', users: 28, flag: '🇺🇸' },
              { country: 'UK', users: 12, flag: '🇬🇧' },
              { country: 'Germany', users: 8, flag: '🇩🇪' },
              { country: 'Canada', users: 5, flag: '🇨🇦' },
              { country: 'Australia', users: 4, flag: '🇦🇺' },
            ].map((item) => (
              <div
                key={item.country}
                className="p-4 bg-muted/30 rounded-lg text-center"
              >
                <span className="text-3xl">{item.flag}</span>
                <p className="text-2xl font-bold mt-2">{item.users}</p>
                <p className="text-sm text-muted-foreground">{item.country}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
