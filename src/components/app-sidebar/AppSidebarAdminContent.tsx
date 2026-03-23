"use client";

import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useCart } from "@/hooks/use-cart";
import {
  FileText,
  LayoutDashboard,
  MapPin,
  MessageSquare,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Separator } from "@/components/ui/separator";
import AppSidebarUserLinks from "./AppSidebarUserLinks";

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
        <AppSidebarUserLinks pathname={pathname} totalItems={totalItems} />
      </SidebarMenu>
    </SidebarContent>
  );
}
