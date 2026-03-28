"use client";

import {
  SidebarContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { useCart } from "@/hooks/use-cart";
import { usePathname } from "next/navigation";
import AppSidebarUserLinks from "./AppSidebarUserLinks";

type AppSidebarContentProps = {
  mobile?: boolean;
};

export default function AppSidebarContent({ mobile = false }: AppSidebarContentProps) {
  const { totalItems } = useCart();
  const pathname = usePathname();

  return (
    <SidebarContent className={mobile ? "px-2 py-2" : "py-2"}>
      <SidebarMenu>
        <AppSidebarUserLinks
          pathname={pathname}
          totalItems={totalItems}
          itemClassName={
            mobile
              ? "flex items-center gap-3 px-3 py-3"
              : "flex flex-col items-center gap-1.5 py-3 px-2"
          }
          iconClassName={mobile ? "h-7 w-7 shrink-0" : "h-6 w-6 shrink-0"}
          labelClassName={
            mobile
              ? "text-sm leading-tight text-left font-medium"
              : "text-[11px] leading-tight text-center font-medium"
          }
          itemWrapperClassName={mobile ? "px-0" : "px-1"}
          buttonClassName={mobile ? "h-auto justify-start" : "h-auto"}
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
