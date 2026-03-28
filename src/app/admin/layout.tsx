import { AppSidebarAdmin } from "@/components/app-sidebar/AppSidebarAdmin";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Profile } from "@/types";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check user role from profiles table
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<Profile>();

  if (error || !profile) {
    console.error("Profile fetch error:", error);
    redirect("/"); // User authenticated but profile not found, redirect to home
  }

  // Check if user has admin role
  if (profile.role !== "admin") {
    redirect("/"); // User authenticated but not admin, redirect to home
  }

  return (
    <SidebarProvider>
      <AppSidebarAdmin />
      <main className="relative z-10 min-h-screen w-full pt-16 md:ml-24 md:w-[calc(100%-6rem)] md:pt-0">
        {children}
      </main>
    </SidebarProvider>
  );
}
