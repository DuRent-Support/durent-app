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
  iconClassName?: string;
  labelClassName?: string;
  itemWrapperClassName?: string;
  cartBadgeClassName?: string;
  buttonClassName?: string;
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
  iconClassName = "h-6 w-6 shrink-0",
  labelClassName = "text-[11px] leading-tight text-center font-medium",
  itemWrapperClassName = "px-1",
  cartBadgeClassName = "absolute right-1 top-2 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground",
  buttonClassName = "h-auto",
}: AppSidebarUserLinksProps) {
  return (
    <>
      <SidebarMenuItem className={itemWrapperClassName}>
        <SidebarMenuButton
          asChild
          className={buttonClassName}
          isActive={isPathActive(pathname, "/")}
        >
          <Link href="/" className={itemClassName}>
            <House className={iconClassName} />
            <span className={labelClassName}>
              Home
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem className={itemWrapperClassName}>
        <SidebarMenuButton
          asChild
          className={buttonClassName}
          isActive={isPathActive(pathname, "/ai-scout")}
        >
          <Link href="/ai-scout" className={itemClassName}>
            <Sparkles className={iconClassName} />
            <span className={labelClassName}>
              AI Scout
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem className={itemWrapperClassName}>
        <SidebarMenuButton
          asChild
          className={buttonClassName}
          isActive={isPathActive(pathname, "/reservations")}
        >
          <Link href="/reservations" className={itemClassName}>
            <CalendarCheck className={iconClassName} />
            <span className={labelClassName}>
              Reservations
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem className={itemWrapperClassName}>
        <SidebarMenuButton
          asChild
          className={buttonClassName}
          isActive={isPathActive(pathname, "/cart")}
        >
          <Link
            href="/cart"
            className={`relative ${itemClassName}`}
          >
            <ShoppingBag className={iconClassName} />
            {totalItems > 0 ? (
              <span className={cartBadgeClassName}>
                {totalItems}
              </span>
            ) : null}
            <span className={labelClassName}>
              Cart
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem className={itemWrapperClassName}>
        <SidebarMenuButton
          asChild
          className={buttonClassName}
          isActive={isPathActive(pathname, "/payments")}
        >
          <Link href="/payments" className={itemClassName}>
            <CreditCard className={iconClassName} />
            <span className={labelClassName}>
              Payments
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </>
  );
}