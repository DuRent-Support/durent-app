"use client";

import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCart } from "@/hooks/use-cart";
import {
  CalendarCheck,
  FileText,
  House,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";

function isPathActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebarAdminContent() {
  const { totalItems } = useCart();
  const pathname = usePathname();

  return (
    <SidebarContent className="py-2">
      <SidebarMenu>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={pathname === "/admin"}
          >
            <Link
              href="/admin"
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <LayoutDashboard className="h-6 w-6 shrink-0" />
              <span className="text-center text-[11px] font-medium leading-tight">
                Dashboard
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={isPathActive(pathname, "/admin/locations")}
          >
            <Link
              href="/admin/locations"
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <MapPin className="h-6 w-6 shrink-0" />
              <span className="text-center text-[11px] font-medium leading-tight">
                Locations
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={isPathActive(pathname, "/admin/tags")}
          >
            <Link
              href="/admin/tags"
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <Tag className="h-6 w-6 shrink-0" />
              <span className="text-center text-[11px] font-medium leading-tight">
                Tags
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={isPathActive(pathname, "/admin/bookings")}
          >
            <Link
              href="/admin/bookings"
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <FileText className="h-6 w-6 shrink-0" />
              <span className="text-center text-[11px] font-medium leading-tight">
                Bookings
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={isPathActive(pathname, "/admin/reviews")}
          >
            <Link
              href="/admin/reviews"
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <MessageSquare className="h-6 w-6 shrink-0" />
              <span className="text-center text-[11px] font-medium leading-tight">
                Reviews
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <Separator className="my-2" />
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={isPathActive(pathname, "/")}
          >
            <Link
              href="/"
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <House className="h-6 w-6 shrink-0" />
              <span className="text-center text-[11px] font-medium leading-tight">
                Home
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={isPathActive(pathname, "/ai-scout")}
          >
            <Link
              href="/ai-scout"
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <Sparkles className="h-6 w-6 shrink-0" />
              <span className="text-center text-[11px] font-medium leading-tight">
                AI Scout
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={isPathActive(pathname, "/cart")}
          >
            <Link
              href="/cart"
              className="relative flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <ShoppingBag className="h-6 w-6 shrink-0" />
              {totalItems > 0 ? (
                <span className="absolute right-1 top-2 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {totalItems}
                </span>
              ) : null}
              <span className="text-center text-[11px] font-medium leading-tight">
                Cart
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton
            asChild
            className="h-auto"
            isActive={isPathActive(pathname, "/reservations")}
          >
            <Link
              href="/reservations"
              className="flex flex-col items-center gap-1.5 px-2 py-3"
            >
              <CalendarCheck className="h-6 w-6 shrink-0" />
              <span className="text-center text-[11px] font-medium leading-tight">
                Reservations
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  );
}
