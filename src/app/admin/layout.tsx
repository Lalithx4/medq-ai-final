'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/provider/theme-provider';
import { useAuth } from '@/provider/AuthProvider';
import {
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Settings,
  Video,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  ChevronLeft,
  Menu,
  Activity,
  TrendingUp,
  Database,
  Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface AdminUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: string;
}

const sidebarItems = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { name: 'Real-time', href: '/admin/realtime', icon: Activity },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Users', href: '/admin/users', icon: Users },
      { name: 'Content', href: '/admin/content', icon: FileText },
      { name: 'Video Streams', href: '/admin/streams', icon: Video },
    ],
  },
  {
    title: 'Revenue',
    items: [
      { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { name: 'Ad Management', href: '/admin/ads', icon: Megaphone },
      { name: 'Revenue Reports', href: '/admin/revenue', icon: TrendingUp },
    ],
  },
  {
    title: 'System',
    items: [
      { name: 'Database', href: '/admin/database', icon: Database },
      { name: 'Settings', href: '/admin/settings', icon: Settings },
      { name: 'Security', href: '/admin/security', icon: Shield },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: authUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Only run access check once auth state is known
    const run = async () => {
      console.log('[ADMIN LAYOUT] Auth state:', { authLoading, authUser });
      
      if (authLoading) {
        console.log('[ADMIN LAYOUT] Still loading auth state...');
        return;
      }

      // No authenticated user: try to get session directly as fallback
      if (!authUser) {
        console.log('[ADMIN LAYOUT] No authUser from context, trying direct session check...');
        
        // Try direct session check as fallback
        const supabase = getBrowserSupabase();
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[ADMIN LAYOUT] Direct session check:', { session: !!session, error });
        
        if (session?.user) {
          console.log('[ADMIN LAYOUT] Found session via direct check, proceeding with user:', session.user.email);
          // Continue with the session user
          const { data: profile } = await supabase
            .from('User')
            .select('id, email, name, image, role')
            .eq('id', session.user.id)
            .single();
          
          if (profile && profile.role === 'ADMIN') {
            setUser(profile);
            setIsLoading(false);
            return;
          } else if (profile) {
            toast.error('Access denied. Admin privileges required.');
            router.push('/dashboard');
            return;
          }
        }
        
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        // eslint-disable-next-line no-console
        console.log('[ADMIN LAYOUT] Checking admin profile for user', {
          id: authUser.id,
          email: authUser.email,
        });

        const supabase = getBrowserSupabase();
        const { data: profile } = await supabase
          .from('User')
          .select('id, email, name, image, role')
          .eq('id', authUser.id)
          .single();

        // eslint-disable-next-line no-console
        console.log('[ADMIN LAYOUT] Loaded profile from User table', { profile });

        if (!profile || profile.role !== 'ADMIN') {
          toast.error('Access denied. Admin privileges required.');
          // eslint-disable-next-line no-console
          console.warn('[ADMIN LAYOUT] User is not admin, redirecting to /dashboard', {
            role: profile?.role,
          });
          router.push('/dashboard');
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('Admin access check failed:', error);
        router.push('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [authLoading, authUser, router]);

  const handleLogout = async () => {
    const supabase = getBrowserSupabase();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md w-full px-6 py-8 border rounded-xl bg-card shadow-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Admin sign-in required</h1>
          <p className="text-sm text-muted-foreground">
            You need to be signed in with an administrator account to access the admin dashboard.
          </p>
          <Link
            href="/auth/login?redirect=/admin"
            className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">BioDocs Admin</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              3
            </span>
          </Button>
          <div className="flex items-center gap-3 pl-4 border-l">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.image} />
              <AvatarFallback>
                {user.name?.charAt(0) || user.email?.charAt(0) || 'A'}
              </AvatarFallback>
            </Avatar>
            <div className="hidden md:block">
              <p className="text-sm font-medium">{user.name || 'Admin'}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-16 bottom-0 bg-card border-r transition-all duration-300 z-40 overflow-y-auto',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <nav className="p-2 space-y-6">
          {sidebarItems.map((section) => (
            <div key={section.title}>
              {!sidebarCollapsed && (
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </p>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <item.icon className="w-5 h-5 shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="text-sm font-medium">{item.name}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Logout */}
          <div className="pt-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">Logout</span>
              )}
            </button>
          </div>

          {/* Back to App */}
          <div>
            <Link
              href="/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5 shrink-0" />
              {!sidebarCollapsed && (
                <span className="text-sm font-medium">Back to App</span>
              )}
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'pt-16 min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'pl-16' : 'pl-64'
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
