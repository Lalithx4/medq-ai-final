"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/providers/theme-provider";
import { LogOut, User } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Button } from "../../ui/button";
import { Skeleton } from "../../ui/skeleton";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
export function getInitials(name: string): string {
  // Split the name by spaces to get individual words
  const words = name.split(" ");
  // Map over the words array, extracting the first letter of each word and converting it to uppercase
  const initials = words.map((word) => word.charAt(0).toUpperCase());
  // Join the initials into a single string
  return initials.join("");
}

export function UserAvatar({ user }: { user: { name?: string; image?: string } | null }) {
  return (
    <Avatar className="h-10 w-10">
      <AvatarImage src={user?.image ?? ""} />
      <AvatarFallback>
        {getInitials(user?.name ?? "U")}
      </AvatarFallback>
    </Avatar>
  );
}

export function UserDetail({ user, loading }: { user: { name?: string; email?: string } | null; loading: boolean }) {
  return (
    <div className="max-w-max overflow-hidden">
      {!loading && user && (
        <div className="max-w-full text-ellipsis px-2 py-1.5">
          <p className="text-ellipsis text-start text-sm font-medium leading-none">
            {user?.name}
          </p>
          <p className="mt-1 text-ellipsis text-xs leading-none text-muted-foreground">
            {user?.email}
          </p>
        </div>
      )}
      {loading && (
        <div className="grid gap-0.5 px-2 py-1.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
      )}
    </div>
  );
}

export default function SideBarDropdown({
  shouldViewFullName = false,
  side,
  align,
}: {
  shouldViewFullName?: boolean;
  side?: "top";
  align?: "start";
}) {
  const router = useRouter();
  const [user, setUser] = useState<{ id?: string; email?: string; name?: string; image?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || data.user.email?.split('@')[0],
          image: data.user.user_metadata?.avatar_url
        });
      }
      setLoading(false);
    });
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex max-w-full cursor-pointer items-center overflow-hidden rounded-md hover:bg-input">
          <UserAvatar user={user} />
          {shouldViewFullName && <UserDetail user={user} loading={loading} />}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align ?? "end"}
        side={side ?? "right"}
        sideOffset={5}
        alignOffset={5}
        className="w-60"
      >
        <UserDetail user={user} loading={loading} />
        <DropdownMenuSeparator />

        <DropdownMenuGroup className="flex flex-col gap-2 p-1">
          <DropdownMenuItem asChild>
            <ThemeToggle />
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />

        <DropdownMenuGroup className="flex flex-col gap-2">
          <DropdownMenuItem asChild>
            <Button variant="outline" className="w-full">
              <Link
                href={user?.id ? `/user/${user.id}` : ""}
                className="flex h-full w-full items-center justify-center p-2"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </Link>
            </Button>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Button
              variant={isLoggingOut ? "outlineLoading" : "outline"}
              className="w-full"
              disabled={isLoggingOut}
              onClick={async () => {
                setIsLoggingOut(true);
                const supabase = getBrowserSupabase();
                await supabase.auth.signOut();
                router.push('/auth/login');
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </Button>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
