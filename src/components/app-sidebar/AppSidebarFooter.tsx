"use client";

import { LogIn, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import { Skeleton } from "../ui/skeleton";
import type { User } from "@supabase/supabase-js";

type AppSidebarFooterProps = {
  mobile?: boolean;
};

function resolveFullName(user: User | null) {
  if (!user) return null;

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullNameCandidate =
    metadata.full_name ?? metadata.name ?? metadata.display_name;

  if (typeof fullNameCandidate !== "string") return null;

  const fullName = fullNameCandidate.trim();
  return fullName.length > 0 ? fullName : null;
}

export default function AppSidebarFooter({ mobile = false }: AppSidebarFooterProps) {
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
        .select("profile_image_url")
        .eq("user_id", userId)
        .maybeSingle<{ profile_image_url: string | null }>();

      if (error) {
        setProfileImageUrl("");
        return;
      }

      setProfileImageUrl(data?.profile_image_url ?? "");
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

  return (
    <SidebarFooter className={mobile ? "border-t border-sidebar-border px-2 py-2" : ""}>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild className={mobile ? "h-auto justify-start" : ""}>
            {isAuthLoading ? (
              <div
                className={
                  mobile
                    ? "flex w-full items-center gap-3 rounded-lg px-3 py-2.5"
                    : "flex h-14 w-14 items-center justify-center rounded-lg pointer-events-none"
                }
                aria-disabled="true"
              >
                <Skeleton className="h-8 w-8 rounded-full" />
                {mobile ? (
                  <div className="flex min-w-0 flex-col gap-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : null}
              </div>
            ) : user ? (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <div
                    className={
                      mobile
                        ? "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-sidebar-accent"
                        : "flex cursor-pointer items-center justify-center"
                    }
                  >
                    <Avatar size="default">
                      <AvatarImage src={profileImageUrl} alt={user.email ?? "User avatar"} />
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || "JD"}
                      </AvatarFallback>
                    </Avatar>

                    {mobile ? (
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-sidebar-foreground">
                          {displayName}
                        </p>
                        <p className="truncate text-xs text-sidebar-foreground/70">
                          {user.email}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </PopoverTrigger>
                <PopoverContent
                  className="w-48 p-2"
                  side={mobile ? "top" : "right"}
                  align={mobile ? "start" : "end"}
                >
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setOpen(false);
                        router.push("/settings");
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </button>
                    <Separator />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Link href="/login">
                {mobile ? (
                  <div className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-sidebar-accent">
                    <LogIn className="h-6 w-6" />
                    <span className="text-sm font-medium">Login</span>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg">
                    <LogIn className="h-6 w-6" />
                  </div>
                )}
              </Link>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
