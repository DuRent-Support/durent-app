"use client";

import {
  SidebarContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { useCart } from "@/hooks/use-cart";
import { usePathname } from "next/navigation";
import AppSidebarUserLinks from "./AppSidebarUserLinks";

export default function AppSidebarContent() {
  const { totalItems } = useCart();
  const pathname = usePathname();

  return (
    <SidebarContent className="py-2">
      <SidebarMenu>
        <AppSidebarUserLinks pathname={pathname} totalItems={totalItems} />
      </SidebarMenu>
    </SidebarContent>
  );
}
