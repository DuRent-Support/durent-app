"use client";

import { LogIn, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback } from "../ui/avatar";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import type { User } from "@supabase/supabase-js";
import { get } from "http";

export default function AppSidebarFooter() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    console.log("User:", user);
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <SidebarFooter className="">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="">
            {user ? (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <div className="flex justify-center items-center cursor-pointer">
                    <Avatar size="default">
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase() || "JD"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" side="right" align="end">
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
                <div className="flex h-14 w-14 items-center justify-center rounded-lg">
                  <LogIn className="h-6 w-6" />
                </div>
              </Link>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
