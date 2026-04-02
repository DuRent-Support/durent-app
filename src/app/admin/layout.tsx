import { AppSidebar } from "@/components/app-sidebar/AppSidebar";
import AppHeader from "@/components/app-header/AppHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { AuthProvider } from "@/providers/AuthProvider";
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
    .eq("user_uuid", user.id)
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
      <AuthProvider>
        <AppHeader />
        <AppSidebar />
        <main className="relative z-10 min-h-screen w-full pt-16 md:pl-24">
          {children}
        </main>
      </AuthProvider>
    </SidebarProvider>
  );
}
