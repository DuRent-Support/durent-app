"use client";

import Image from "next/image";
import { Menu } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import AppSidebarAdminContent from "./AppSidebarAdminContent";
import AppSidebarFooter from "./AppSidebarFooter";

export default function AppSidebarAdminMobile() {
  const [open, setOpen] = useState(false);

  return (
    <>
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
            DuRent Admin
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
            <SheetTitle>Menu Admin</SheetTitle>
            <SheetDescription>
              Sidebar menu untuk navigasi halaman admin.
            </SheetDescription>
          </SheetHeader>

          <div className="flex h-full flex-col">
            <div className="border-b border-sidebar-border px-4 py-4 text-left">
              <p className="font-display text-base font-semibold text-sidebar-foreground">
                Menu Admin
              </p>
            </div>
            <AppSidebarAdminContent mobile />
            <AppSidebarFooter mobile />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
