"use client";

import { LogIn, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { User } from "@supabase/supabase-js";

function resolveFullName(user: User | null) {
  if (!user) return null;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullNameCandidate =
    metadata.full_name ?? metadata.name ?? metadata.display_name;

  if (typeof fullNameCandidate !== "string") return null;

  const fullName = fullNameCandidate.trim();
  return fullName.length > 0 ? fullName : null;
}

export default function AppHeaderProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getProfileImage = async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("user_uuid", userId)
        .maybeSingle<{ avatar_url: string | null }>();

      if (error) {
        setProfileImageUrl("");
        return;
      }

      setProfileImageUrl(data?.avatar_url ?? "");
    };

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        setUser(user);

        if (user?.id) {
          await getProfileImage(user.id);
        } else {
          setProfileImageUrl("");
        }
      } finally {
        setIsAuthLoading(false);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser?.id) {
        void getProfileImage(currentUser.id);
      } else {
        setProfileImageUrl("");
      }

      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  };

  const fullName = resolveFullName(user);
  const displayName = fullName ?? user?.email?.split("@")[0] ?? "Guest";

  if (isAuthLoading) {
    return (
      <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-2 py-1.5">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-1 pr-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/80 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        <LogIn className="h-4 w-4" />
        <span>Login</span>
      </Link>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-3 rounded-full px-2.5 py-1.5 text-left transition-colors hover:bg-accent"
        >
          <Avatar size="default">
            <AvatarImage
              src={profileImageUrl}
              alt={user.email ?? "User avatar"}
            />
            <AvatarFallback>
              {user.email?.charAt(0).toUpperCase() || "JD"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 pr-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-52 p-2" align="end">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => {
              setOpen(false);
              router.push("/settings");
            }}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <Separator />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
