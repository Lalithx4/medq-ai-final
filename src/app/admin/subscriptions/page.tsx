'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Search,
  MoreHorizontal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Crown,
  ArrowUpDown,
  CheckCircle,
  XCircle,
  Clock,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Subscription {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  subscriptionPlan: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  credits: number;
  totalTokenCost: number;
}

interface SubscriptionStats {
  totalSubscribers: number;
  freeUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  mrr: number;
  churnRate: number;
}

const ITEMS_PER_PAGE = 10;

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>('subscriptionStart');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchSubscriptions();
    fetchStats();
  }, []);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      const supabase = getBrowserSupabase();
      const { data, error } = await supabase
        .from('User')
        .select('id, email, name, image, subscriptionPlan, subscriptionStart, subscriptionEnd, credits, totalTokenCost')
        .order('subscriptionStart', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast.error('Failed to fetch subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const supabase = getBrowserSupabase();
      const { data: users } = await supabase
        .from('User')
        .select('subscriptionPlan');

      if (users) {
        const freeUsers = users.filter(u => u.subscriptionPlan === 'free').length;
        const proUsers = users.filter(u => u.subscriptionPlan === 'pro').length;
        const enterpriseUsers = users.filter(u => u.subscriptionPlan === 'enterprise').length;

        // Calculate MRR (Monthly Recurring Revenue)
        const proMRR = proUsers * 29; // $29/month
        const enterpriseMRR = enterpriseUsers * 99; // $99/month
        const mrr = proMRR + enterpriseMRR;

        setStats({
          totalSubscribers: users.length,
          freeUsers,
          proUsers,
          enterpriseUsers,
          mrr,
          churnRate: 2.5, // Placeholder
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredSubscriptions = useMemo(() => {
    let result = [...subscriptions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (sub) =>
          sub.email?.toLowerCase().includes(query) ||
          sub.name?.toLowerCase().includes(query)
      );
    }

    if (planFilter !== 'all') {
      result = result.filter((sub) => sub.subscriptionPlan === planFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortField as keyof Subscription];
      const bVal = b[sortField as keyof Subscription];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return result;
  }, [subscriptions, searchQuery, planFilter, sortField, sortOrder]);

  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubscriptions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubscriptions, currentPage]);

  const totalPages = Math.ceil(filteredSubscriptions.length / ITEMS_PER_PAGE);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-purple-500 gap-1"><Crown className="w-3 h-3" />Pro</Badge>;
      case 'enterprise':
        return <Badge className="bg-orange-500 gap-1"><Crown className="w-3 h-3" />Enterprise</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  };

  const getSubscriptionStatus = (endDate: string | null) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Expired</Badge>;
    } else if (daysLeft <= 7) {
      return <Badge className="bg-yellow-500 gap-1"><Clock className="w-3 h-3" />Expiring Soon</Badge>;
    } else {
      return <Badge className="bg-green-500 gap-1"><CheckCircle className="w-3 h-3" />Active</Badge>;
    }
  };

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
  }: {
    title: string;
    value: string | number;
    icon: any;
    color: string;
    subtitle?: string;
  }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className={cn('p-3 rounded-xl', color)}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
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
            <CreditCard className="w-8 h-8" />
            Subscriptions
          </h1>
          <p className="text-muted-foreground">
            Manage user subscriptions and billing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchSubscriptions} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Total Users"
            value={stats.totalSubscribers.toLocaleString()}
            icon={Users}
            color="bg-primary/10 text-primary"
          />
          <StatCard
            title="Free Users"
            value={stats.freeUsers}
            icon={Users}
            color="bg-gray-500/10 text-gray-500"
          />
          <StatCard
            title="Pro Users"
            value={stats.proUsers}
            icon={Crown}
            color="bg-purple-500/10 text-purple-500"
          />
          <StatCard
            title="Enterprise"
            value={stats.enterpriseUsers}
            icon={Crown}
            color="bg-orange-500/10 text-orange-500"
          />
          <StatCard
            title="MRR"
            value={`$${stats.mrr.toLocaleString()}`}
            icon={DollarSign}
            color="bg-green-500/10 text-green-500"
          />
          <StatCard
            title="Churn Rate"
            value={`${stats.churnRate}%`}
            icon={TrendingUp}
            color="bg-red-500/10 text-red-500"
          />
        </div>
      )}

      {/* Plan Distribution */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
            <CardDescription>Breakdown of users by subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Free</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.freeUsers} ({((stats.freeUsers / stats.totalSubscribers) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress value={(stats.freeUsers / stats.totalSubscribers) * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pro</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.proUsers} ({((stats.proUsers / stats.totalSubscribers) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress value={(stats.proUsers / stats.totalSubscribers) * 100} className="h-2 [&>div]:bg-purple-500" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Enterprise</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.enterpriseUsers} ({((stats.enterpriseUsers / stats.totalSubscribers) * 100).toFixed(1)}%)
                  </span>
                </div>
                <Progress value={(stats.enterpriseUsers / stats.totalSubscribers) * 100} className="h-2 [&>div]:bg-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('credits')}
                >
                  <div className="flex items-center gap-1">
                    Credits
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('totalTokenCost')}
                >
                  <div className="flex items-center gap-1">
                    Usage
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer"
                  onClick={() => handleSort('subscriptionEnd')}
                >
                  <div className="flex items-center gap-1">
                    Expires
                    <ArrowUpDown className="w-4 h-4" />
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <div className="h-12 bg-muted animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No subscriptions found</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={sub.image || undefined} />
                          <AvatarFallback>
                            {sub.name?.charAt(0) || sub.email?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{sub.name || 'No name'}</p>
                          <p className="text-sm text-muted-foreground">{sub.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(sub.subscriptionPlan)}</TableCell>
                    <TableCell>
                      {sub.subscriptionPlan !== 'free' 
                        ? getSubscriptionStatus(sub.subscriptionEnd)
                        : <Badge variant="secondary">N/A</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{sub.credits}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">${sub.totalTokenCost.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      {sub.subscriptionEnd
                        ? format(new Date(sub.subscriptionEnd), 'MMM d, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Manage Subscription
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Crown className="w-4 h-4 mr-2" />
                            Upgrade Plan
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredSubscriptions.length)} of{' '}
                {filteredSubscriptions.length} subscriptions
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
