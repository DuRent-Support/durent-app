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

type AppSidebarAdminContentProps = {
  mobile?: boolean;
};

export default function AppSidebarAdminContent({
  mobile = false,
}: AppSidebarAdminContentProps) {
  const { totalItems } = useCart();
  const pathname = usePathname();

  const itemClassName = mobile
    ? "flex items-center gap-3 px-3 py-3"
    : "flex flex-col items-center gap-1.5 px-2 py-3";
  const iconClassName = mobile ? "h-7 w-7 shrink-0" : "h-6 w-6 shrink-0";
  const labelClassName = mobile
    ? "text-left text-sm font-medium leading-tight"
    : "text-center text-[11px] font-medium leading-tight";
  const itemWrapperClassName = mobile ? "px-0" : "px-1";
  const buttonClassName = mobile ? "h-auto justify-start" : "h-auto";

  return (
    <SidebarContent className={mobile ? "px-2 py-2" : "py-2"}>
      <SidebarMenu>
        <SidebarMenuItem className={itemWrapperClassName}>
          <SidebarMenuButton
            asChild
            className={buttonClassName}
            isActive={pathname === "/admin"}
          >
            <Link href="/admin" className={itemClassName}>
              <LayoutDashboard className={iconClassName} />
              <span className={labelClassName}>
                Dashboard
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className={itemWrapperClassName}>
          <SidebarMenuButton
            asChild
            className={buttonClassName}
            isActive={isPathActive(pathname, "/admin/locations")}
          >
            <Link href="/admin/locations" className={itemClassName}>
              <MapPin className={iconClassName} />
              <span className={labelClassName}>
                Locations
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className={itemWrapperClassName}>
          <SidebarMenuButton
            asChild
            className={buttonClassName}
            isActive={isPathActive(pathname, "/admin/tags")}
          >
            <Link href="/admin/tags" className={itemClassName}>
              <Tag className={iconClassName} />
              <span className={labelClassName}>
                Tags
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className={itemWrapperClassName}>
          <SidebarMenuButton
            asChild
            className={buttonClassName}
            isActive={isPathActive(pathname, "/admin/bookings")}
          >
            <Link href="/admin/bookings" className={itemClassName}>
              <FileText className={iconClassName} />
              <span className={labelClassName}>
                Bookings
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className={itemWrapperClassName}>
          <SidebarMenuButton
            asChild
            className={buttonClassName}
            isActive={isPathActive(pathname, "/admin/reviews")}
          >
            <Link href="/admin/reviews" className={itemClassName}>
              <MessageSquare className={iconClassName} />
              <span className={labelClassName}>
                Reviews
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <Separator className="my-2" />
        <AppSidebarUserLinks
          pathname={pathname}
          totalItems={totalItems}
          itemClassName={itemClassName}
          iconClassName={iconClassName}
          labelClassName={labelClassName}
          itemWrapperClassName={itemWrapperClassName}
          buttonClassName={buttonClassName}
          cartBadgeClassName={
            mobile
              ? "absolute left-7 top-2.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground"
              : "absolute right-1 top-2 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground"
          }
        />
      </SidebarMenu>
    </SidebarContent>
  );
}
