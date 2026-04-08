import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import type { Profile } from "@/types";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request);

  const url = request.nextUrl.clone();

  const publicRoutes = new Set(["/login"]);
  const guestRoutes = new Set([
    "/explore",
    "/cart",
    "/ai-scout",
    "/locations",
    "/crews",
    "/food-and-beverage",
    "/expendables",
    "/bundles",
    "/rentals",
  ]);
  const isPublicRoute = publicRoutes.has(url.pathname);
  const isGuestRoute = guestRoutes.has(url.pathname);

  // Admin routes
  const isAdminRoute = url.pathname.startsWith("/admin");

  // Jika user sudah login dan mencoba akses login
  if (user && isPublicRoute) {
    // Cek role user dari profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_uuid", user.id)
      .single<Profile>();

    // Redirect berdasarkan role
    if (profile?.role === "admin") {
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    } else {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  // Jika user mencoba akses admin routes
  if (isAdminRoute) {
    // Jika belum login, redirect ke login
    if (!user) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    // Jika sudah login, cek role
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_uuid", user.id)
      .single<Profile>();

    // Jika bukan admin, redirect ke home
    if (profile?.role !== "admin") {
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  if (!user) {
    if (url.pathname === "/") {
      url.pathname = "/explore";
      return NextResponse.redirect(url);
    }

    if (!isPublicRoute && !isGuestRoute && !isAdminRoute) {
      url.pathname = "/explore";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (they handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)",
  ],
};
