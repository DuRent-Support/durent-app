"use client";

import {
  Camera,
  Boxes,
  CalendarCheck,
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
  Store,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
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
  SidebarMenu,
} from "@/components/ui/sidebar";
import SidebarCollapsibleTrigger from "@/components/app-sidebar/SidebarCollapsibleTrigger";
import SidebarNavItem from "@/components/app-sidebar/SidebarNavItem";

type SidebarNavContentProps = {
  mobile?: boolean;
  pathname: string;
  totalItems: number;
  isAdmin: boolean;
  isAuthenticated: boolean;
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
  isAuthenticated,
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
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarCollapsibleTrigger label="Main" />
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {isAuthenticated ? (
                  <SidebarNavItem
                    href="/"
                    label="Dashboard"
                    icon={House}
                    isActive={isPathActive(pathname, "/")}
                    itemClassName={itemClassName}
                    iconClassName={iconClassName}
                    labelClassName={labelClassName}
                    itemWrapperClassName={itemWrapperClassName}
                    buttonClassName={buttonClassName}
                  />
                ) : null}
                <SidebarNavItem
                  href="/explore"
                  label="Explore"
                  icon={Store}
                  isActive={isPathActive(pathname, "/explore")}
                  itemClassName={itemClassName}
                  iconClassName={iconClassName}
                  labelClassName={labelClassName}
                  itemWrapperClassName={itemWrapperClassName}
                  buttonClassName={buttonClassName}
                />
                <SidebarNavItem
                  href="/cart"
                  label="Cart"
                  icon={ShoppingBag}
                  isActive={isPathActive(pathname, "/cart")}
                  itemClassName={itemClassName}
                  iconClassName={iconClassName}
                  labelClassName={labelClassName}
                  itemWrapperClassName={itemWrapperClassName}
                  buttonClassName={buttonClassName}
                  badgeCount={totalItems}
                />
                <SidebarMenu>
                  <SidebarNavItem
                    href="/ai-scout"
                    label="AI Scout"
                    icon={Sparkles}
                    isActive={isPathActive(pathname, "/ai-scout")}
                    itemClassName={itemClassName}
                    iconClassName={iconClassName}
                    labelClassName={labelClassName}
                    itemWrapperClassName={itemWrapperClassName}
                    buttonClassName={buttonClassName}
                  />
                </SidebarMenu>
                {isAuthenticated ? (
                  <>
                    <SidebarNavItem
                      href="/payments"
                      label="Payments"
                      icon={CreditCard}
                      isActive={isPathActive(pathname, "/payments")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/reservations"
                      label="Reservations"
                      icon={CalendarCheck}
                      isActive={isPathActive(pathname, "/reservations")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </>
                ) : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>

      <SidebarGroup className="px-1 py-0">
        <Collapsible defaultOpen className="group/collapsible">
          <SidebarCollapsibleTrigger label="Katalog" />
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarNavItem
                  href="/locations"
                  label="Locations"
                  icon={MapPin}
                  isActive={isPathActive(pathname, "/locations")}
                  itemClassName={itemClassName}
                  iconClassName={iconClassName}
                  labelClassName={labelClassName}
                  itemWrapperClassName={itemWrapperClassName}
                  buttonClassName={buttonClassName}
                />
                <SidebarNavItem
                  href="/crews"
                  label="Crews"
                  icon={Users}
                  isActive={isPathActive(pathname, "/crews")}
                  itemClassName={itemClassName}
                  iconClassName={iconClassName}
                  labelClassName={labelClassName}
                  itemWrapperClassName={itemWrapperClassName}
                  buttonClassName={buttonClassName}
                />
                <SidebarNavItem
                  href="/rentals"
                  label="Rentals"
                  icon={Camera}
                  isActive={isPathActive(pathname, "/rentals")}
                  itemClassName={itemClassName}
                  iconClassName={iconClassName}
                  labelClassName={labelClassName}
                  itemWrapperClassName={itemWrapperClassName}
                  buttonClassName={buttonClassName}
                />
                <SidebarNavItem
                  href="/food-and-beverage"
                  label="Food & Beverage"
                  icon={UtensilsCrossed}
                  isActive={isPathActive(pathname, "/food-and-beverage")}
                  itemClassName={itemClassName}
                  iconClassName={iconClassName}
                  labelClassName={labelClassName}
                  itemWrapperClassName={itemWrapperClassName}
                  buttonClassName={buttonClassName}
                />
                <SidebarNavItem
                  href="/expendables"
                  label="Expendables"
                  icon={Boxes}
                  isActive={isPathActive(pathname, "/expendables")}
                  itemClassName={itemClassName}
                  iconClassName={iconClassName}
                  labelClassName={labelClassName}
                  itemWrapperClassName={itemWrapperClassName}
                  buttonClassName={buttonClassName}
                />
                <SidebarNavItem
                  href="/bundles"
                  label="Bundles"
                  icon={Package}
                  isActive={isPathActive(pathname, "/bundles")}
                  itemClassName={itemClassName}
                  iconClassName={iconClassName}
                  labelClassName={labelClassName}
                  itemWrapperClassName={itemWrapperClassName}
                  buttonClassName={buttonClassName}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </Collapsible>
      </SidebarGroup>

      {isAdmin ? (
        <>
          <SidebarGroup className="px-1 pt-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarCollapsibleTrigger label="Admin" />
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarNavItem
                      href="/admin"
                      label="Dashboard"
                      icon={LayoutDashboard}
                      isActive={isPathActive(pathname, "/admin", {
                        exact: true,
                      })}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/orders"
                      label="Orders"
                      icon={FileText}
                      isActive={isPathActive(pathname, "/admin/orders")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/reviews"
                      label="Reviews"
                      icon={Star}
                      isActive={isPathActive(pathname, "/admin/reviews")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/inventory"
                      label="Inventory"
                      icon={Boxes}
                      isActive={isPathActive(pathname, "/admin/inventory")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarCollapsibleTrigger label="Bundles CRUD" />
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarNavItem
                      href="/admin/bundles"
                      label="Bundles"
                      icon={Package}
                      isActive={isPathActive(pathname, "/admin/bundles")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarCollapsibleTrigger label="Locations CRUD" />
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarNavItem
                      href="/admin/locations"
                      label="Locations"
                      icon={MapPin}
                      isActive={isPathActive(pathname, "/admin/locations", {
                        exact: true,
                      })}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/locations/tags"
                      label="Tags"
                      icon={Tag}
                      isActive={isPathActive(pathname, "/admin/locations/tags")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarCollapsibleTrigger label="Crews CRUD" />
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarNavItem
                      href="/admin/crews"
                      label="Crews"
                      icon={Users}
                      isActive={isPathActive(pathname, "/admin/crews", {
                        exact: true,
                      })}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/crews/skills"
                      label="Skills"
                      icon={Sparkles}
                      isActive={isPathActive(pathname, "/admin/crews/skills")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarCollapsibleTrigger label="Expendables CRUD" />
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarNavItem
                      href="/admin/expendables"
                      label="Expendables"
                      icon={Boxes}
                      isActive={isPathActive(pathname, "/admin/expendables")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarCollapsibleTrigger label="Food & Beverage CRUD" />
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarNavItem
                      href="/admin/food-and-beverage"
                      label="Food & Beverage"
                      icon={UtensilsCrossed}
                      isActive={isPathActive(
                        pathname,
                        "/admin/food-and-beverage",
                        {
                          exact: true,
                        },
                      )}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/food-and-beverage/tags"
                      label="Tags"
                      icon={Tag}
                      isActive={isPathActive(
                        pathname,
                        "/admin/food-and-beverage/tags",
                      )}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarCollapsibleTrigger label="Rentals CRUD" />
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarNavItem
                      href="/admin/rentals"
                      label="Rentals"
                      icon={Camera}
                      isActive={isPathActive(pathname, "/admin/rentals")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          <SidebarGroup className="px-1 pt-1">
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarCollapsibleTrigger label="Categories CRUD" />
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarNavItem
                      href="/admin/categories"
                      label="Categories"
                      icon={Tag}
                      isActive={isPathActive(pathname, "/admin/categories")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/sub-categories"
                      label="Sub Categories"
                      icon={Tag}
                      isActive={isPathActive(pathname, "/admin/sub-categories")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/bundle-type"
                      label="Bundle Type"
                      icon={Package}
                      isActive={isPathActive(pathname, "/admin/bundle-type")}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                    <SidebarNavItem
                      href="/admin/bundle-categories"
                      label="Bundle Categories"
                      icon={Boxes}
                      isActive={isPathActive(
                        pathname,
                        "/admin/bundle-categories",
                      )}
                      itemClassName={itemClassName}
                      iconClassName={iconClassName}
                      labelClassName={labelClassName}
                      itemWrapperClassName={itemWrapperClassName}
                      buttonClassName={buttonClassName}
                    />
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
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
  const { isAdmin, status } = useAuth();
  const isAuthenticated = status === "authenticated";

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
            isAuthenticated={isAuthenticated}
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
              isAuthenticated={isAuthenticated}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
