"use client";

import Link from "next/link";
import {
  CalendarCheck,
  CreditCard,
  House,
  ShoppingBag,
  Sparkles,
} from "lucide-react";

import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type AppSidebarUserLinksProps = {
  pathname: string;
  totalItems: number;
  itemClassName?: string;
};

function isPathActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppSidebarUserLinks({
  pathname,
  totalItems,
  itemClassName = "flex flex-col items-center gap-1.5 py-3 px-2",
}: AppSidebarUserLinksProps) {
  return (
    <>
      <SidebarMenuItem className="px-1">
        <SidebarMenuButton
          asChild
          className="h-auto"
          isActive={isPathActive(pathname, "/")}
        >
          <Link href="/" className={itemClassName}>
            <House className="h-6 w-6 shrink-0" />
            <span className="text-[11px] leading-tight text-center font-medium">
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
          <Link href="/ai-scout" className={itemClassName}>
            <Sparkles className="h-6 w-6 shrink-0" />
            <span className="text-[11px] leading-tight text-center font-medium">
              AI Scout
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
          <Link href="/reservations" className={itemClassName}>
            <CalendarCheck className="h-6 w-6 shrink-0" />
            <span className="text-[11px] leading-tight text-center font-medium">
              Reservations
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
            className={`relative ${itemClassName}`}
          >
            <ShoppingBag className="h-6 w-6 shrink-0" />
            {totalItems > 0 ? (
              <span className="absolute right-1 top-2 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                {totalItems}
              </span>
            ) : null}
            <span className="text-[11px] leading-tight text-center font-medium">
              Cart
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem className="px-1">
        <SidebarMenuButton
          asChild
          className="h-auto"
          isActive={isPathActive(pathname, "/payments")}
        >
          <Link href="/payments" className={itemClassName}>
            <CreditCard className="h-6 w-6 shrink-0" />
            <span className="text-[11px] leading-tight text-center font-medium">
              Payments
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );
}