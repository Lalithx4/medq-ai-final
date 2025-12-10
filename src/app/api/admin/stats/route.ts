import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('User')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const today = new Date();
    const startOfToday = startOfDay(today).toISOString();
    const weekAgo = subDays(today, 7).toISOString();
    const monthAgo = subDays(today, 30).toISOString();

    // Fetch all stats in parallel
    const [
      totalUsersResult,
      newUsersTodayResult,
      newUsersWeekResult,
      activeUsersResult,
      totalDocumentsResult,
      totalStreamsResult,
      liveStreamsResult,
      paymentsResult,
    ] = await Promise.all([
      supabase.from('User').select('*', { count: 'exact', head: true }),
      supabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', startOfToday),
      supabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', weekAgo),
      supabase.from('User').select('*', { count: 'exact', head: true }).gte('updatedAt', weekAgo),
      supabase.from('pdf_documents').select('*', { count: 'exact', head: true }),
      supabase.from('streaming_rooms').select('*', { count: 'exact', head: true }),
      supabase.from('streaming_rooms').select('*', { count: 'exact', head: true }).eq('status', 'live'),
      supabase.from('payments').select('amount, createdAt').eq('status', 'completed'),
    ]);

    const totalRevenue = paymentsResult.data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const monthlyPayments = paymentsResult.data?.filter(p => 
      new Date(p.createdAt) >= new Date(monthAgo)
    ) || [];
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

    // User growth data (last 30 days)
    const { data: userGrowthData } = await supabase
      .from('User')
      .select('createdAt')
      .gte('createdAt', monthAgo)
      .order('createdAt', { ascending: true });

    // Group by date
    const userGrowth: Record<string, number> = {};
    userGrowthData?.forEach(u => {
      const date = u.createdAt.split('T')[0];
      userGrowth[date] = (userGrowth[date] || 0) + 1;
    });

    // Subscription breakdown
    const { data: subscriptionData } = await supabase
      .from('User')
      .select('subscriptionPlan');

    const subscriptionBreakdown = {
      free: subscriptionData?.filter(u => u.subscriptionPlan === 'free').length || 0,
      pro: subscriptionData?.filter(u => u.subscriptionPlan === 'pro').length || 0,
      enterprise: subscriptionData?.filter(u => u.subscriptionPlan === 'enterprise').length || 0,
    };

    return NextResponse.json({
      users: {
        total: totalUsersResult.count || 0,
        newToday: newUsersTodayResult.count || 0,
        newThisWeek: newUsersWeekResult.count || 0,
        active: activeUsersResult.count || 0,
      },
      documents: {
        total: totalDocumentsResult.count || 0,
      },
      streams: {
        total: totalStreamsResult.count || 0,
        live: liveStreamsResult.count || 0,
      },
      revenue: {
        total: totalRevenue / 100,
        monthly: monthlyRevenue / 100,
      },
      userGrowth: Object.entries(userGrowth).map(([date, count]) => ({ date, count })),
      subscriptionBreakdown,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
