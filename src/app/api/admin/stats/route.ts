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
    ] = await Promise.all([
      supabase.from('User').select('*', { count: 'exact', head: true }),
      supabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', startOfToday),
      supabase.from('User').select('*', { count: 'exact', head: true }).gte('createdAt', weekAgo),
      supabase.from('User').select('*', { count: 'exact', head: true }).gte('updatedAt', weekAgo),
      supabase.from('pdf_documents').select('*', { count: 'exact', head: true }),
    ]);

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
      userGrowth: Object.entries(userGrowth).map(([date, count]) => ({ date, count })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
