"use client";

import {
  Camera,
  CalendarCheck,
  ChevronDown,
  Boxes,
  CreditCard,
  FileText,
  House,
  LayoutDashboard,
  MapPin,
  Menu,
  Package,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type SidebarNavContentProps = {
  mobile?: boolean;
  pathname: string;
  totalItems: number;
  isAdmin: boolean;
};

function isPathActive(
  pathname: string,
  href: string,
  options?: { exact?: boolean },
) {
  const exact = options?.exact ?? false;

  const normalizedPathname =
    pathname !== "/" ? pathname.replace(/\/+$/, "") : "/";
  const normalizedHref = href !== "/" ? href.replace(/\/+$/, "") : "/";

  if (href === "/") {
    return normalizedPathname === "/";
  }

  if (exact) {
    return normalizedPathname === normalizedHref;
  }

  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  );
}

function SidebarNavContent({
  mobile = false,
  pathname,
  totalItems,
  isAdmin,
}: SidebarNavContentProps) {
  const itemClassName = mobile
    ? "flex w-full items-center gap-3 px-3 py-3"
    : "flex w-full items-center gap-3 px-2.5 py-2.5";
  const iconClassName = mobile ? "h-6 w-6 shrink-0" : "h-4 w-4 shrink-0";
  const labelClassName = "text-sm font-medium leading-tight";
  const itemWrapperClassName = "px-0";
  const buttonClassName = "h-auto justify-start";

  return (
    <SidebarContent className="px-2 py-2">
      <SidebarGroup className="px-1 pb-1">
        <SidebarGroupLabel>Main</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem className={itemWrapperClassName}>
              <SidebarMenuButton
                asChild
                className={buttonClassName}
                isActive={isPathActive(pathname, "/")}
              >
                <Link href="/" className={itemClassName}>
                  <House className={iconClassName} />
                  <span className={labelClassName}>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem className={itemWrapperClassName}>
              <SidebarMenuButton
                asChild
                className={buttonClassName}
                isActive={isPathActive(pathname, "/cart")}
              >
                <Link href="/cart" className={itemClassName}>
                  <ShoppingBag className={iconClassName} />
                  <span className={labelClassName}>Cart</span>
                  {totalItems > 0 ? (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {totalItems}
                    </span>
                  ) : null}
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
                  <span className={labelClassName}>Payments</span>
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
                  <span className={labelClassName}>Reservations</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup className="px-1 py-0">
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between px-2">
              Katalog
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/locations")}
                  >
                    <Link href="/locations" className={itemClassName}>
                      <MapPin className={iconClassName} />
                      <span className={labelClassName}>Locations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/crew")}
                  >
                    <Link href="/crew" className={itemClassName}>
                      <Users className={iconClassName} />
                      <span className={labelClassName}>Crew</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/rentals")}
                  >
                    <Link href="/rentals" className={itemClassName}>
                      <Camera className={iconClassName} />
                      <span className={labelClassName}>Rentals</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/bundles")}
                  >
                    <Link href="/bundles" className={itemClassName}>
                      <Package className={iconClassName} />
                      <span className={labelClassName}>Bundles</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/food-and-beverage")}
                  >
                    <Link href="/food-and-beverage" className={itemClassName}>
                      <UtensilsCrossed className={iconClassName} />
                      <span className={labelClassName}>Food & Beverage</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/expendables")}
                  >
                    <Link href="/expendables" className={itemClassName}>
                      <Boxes className={iconClassName} />
                      <span className={labelClassName}>Expendables</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>

      <SidebarGroup className="px-1 pt-1">
        <SidebarGroupLabel>Tools</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem className={itemWrapperClassName}>
              <SidebarMenuButton
                asChild
                className={buttonClassName}
                isActive={isPathActive(pathname, "/ai-scout")}
              >
                <Link href="/ai-scout" className={itemClassName}>
                  <Sparkles className={iconClassName} />
                  <span className={labelClassName}>AI Scout</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {isAdmin ? (
        <>
          <SidebarGroup className="px-1 pt-1">
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin", { exact: true })}
                  >
                    <Link href="/admin" className={itemClassName}>
                      <LayoutDashboard className={iconClassName} />
                      <span className={labelClassName}>Dashboard</span>
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
                      <span className={labelClassName}>Bookings</span>
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
                      <Star className={iconClassName} />
                      <span className={labelClassName}>Reviews</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <SidebarGroupLabel>Bundles CRUD</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/bundles")}
                  >
                    <Link href="/admin/bundles" className={itemClassName}>
                      <Package className={iconClassName} />
                      <span className={labelClassName}>Bundles</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <SidebarGroupLabel>Locations CRUD</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/locations", {
                      exact: true,
                    })}
                  >
                    <Link href="/admin/locations" className={itemClassName}>
                      <MapPin className={iconClassName} />
                      <span className={labelClassName}>Locations</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/locations/tags")}
                  >
                    <Link
                      href="/admin/locations/tags"
                      className={itemClassName}
                    >
                      <Tag className={iconClassName} />
                      <span className={labelClassName}>Tags</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <SidebarGroupLabel>Crews CRUD</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/crews", {
                      exact: true,
                    })}
                  >
                    <Link href="/admin/crews" className={itemClassName}>
                      <Users className={iconClassName} />
                      <span className={labelClassName}>Crews</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/crews/skills")}
                  >
                    <Link href="/admin/crews/skills" className={itemClassName}>
                      <Sparkles className={iconClassName} />
                      <span className={labelClassName}>Skills</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <SidebarGroupLabel>Expendables CRUD</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/expendables")}
                  >
                    <Link href="/admin/expendables" className={itemClassName}>
                      <Boxes className={iconClassName} />
                      <span className={labelClassName}>Expendables</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <SidebarGroupLabel>Food & Beverage CRUD</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(
                      pathname,
                      "/admin/food-and-beverage",
                      { exact: true },
                    )}
                  >
                    <Link
                      href="/admin/food-and-beverage"
                      className={itemClassName}
                    >
                      <UtensilsCrossed className={iconClassName} />
                      <span className={labelClassName}>Food & Beverage</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(
                      pathname,
                      "/admin/food-and-beverage/tags",
                    )}
                  >
                    <Link
                      href="/admin/food-and-beverage/tags"
                      className={itemClassName}
                    >
                      <Tag className={iconClassName} />
                      <span className={labelClassName}>Tags</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <SidebarGroupLabel>Rentals CRUD</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/rentals")}
                  >
                    <Link href="/admin/rentals" className={itemClassName}>
                      <Camera className={iconClassName} />
                      <span className={labelClassName}>Rentals</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <SidebarGroupLabel>Categories CRUD</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/categories")}
                  >
                    <Link href="/admin/categories" className={itemClassName}>
                      <Tag className={iconClassName} />
                      <span className={labelClassName}>Categories</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/sub-categories")}
                  >
                    <Link
                      href="/admin/sub-categories"
                      className={itemClassName}
                    >
                      <Tag className={iconClassName} />
                      <span className={labelClassName}>Sub Categories</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(pathname, "/admin/bundle-type")}
                  >
                    <Link href="/admin/bundle-type" className={itemClassName}>
                      <Package className={iconClassName} />
                      <span className={labelClassName}>Bundle Type</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem className={itemWrapperClassName}>
                  <SidebarMenuButton
                    asChild
                    className={buttonClassName}
                    isActive={isPathActive(
                      pathname,
                      "/admin/bundle-categories",
                    )}
                  >
                    <Link
                      href="/admin/bundle-categories"
                      className={itemClassName}
                    >
                      <Boxes className={iconClassName} />
                      <span className={labelClassName}>Bundle Categories</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      ) : null}
    </SidebarContent>
  );
}

export function AppSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { isAdmin } = useAuth();

  return (
    <>
      <div className="hidden md:block">
        <Sidebar
          variant="sidebar"
          collapsible="icon"
          className="top-16 z-30 h-[calc(100svh-4rem)]"
        >
          <SidebarNavContent
            pathname={pathname}
            totalItems={totalItems}
            isAdmin={isAdmin}
          />
        </Sidebar>
      </div>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-foreground">
            <Image
              src="/durent-black.webp"
              alt="DuRent"
              width={22}
              height={22}
              className="h-5 w-5"
              priority
            />
          </div>
          <span className="font-display text-sm font-semibold tracking-wide text-foreground">
            DuRent
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => setOpen(true)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="bg-sidebar p-0 text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu Navigasi</SheetTitle>
            <SheetDescription>
              Sidebar menu untuk navigasi halaman pengguna.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-full flex-col">
            <div className="border-b border-sidebar-border px-4 py-4 text-left">
              <p className="font-display text-base font-semibold text-sidebar-foreground">
                Menu
              </p>
            </div>
            <SidebarNavContent
              mobile
              pathname={pathname}
              totalItems={totalItems}
              isAdmin={isAdmin}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
