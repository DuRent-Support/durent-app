import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

type SidebarNavItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  itemClassName: string;
  iconClassName: string;
  labelClassName: string;
  itemWrapperClassName: string;
  buttonClassName: string;
  badgeCount?: number;
};

export default function SidebarNavItem({
  href,
  label,
  icon: Icon,
  isActive,
  itemClassName,
  iconClassName,
  labelClassName,
  itemWrapperClassName,
  buttonClassName,
  badgeCount,
}: SidebarNavItemProps) {
  return (
    <SidebarMenuItem className={itemWrapperClassName}>
      <SidebarMenuButton
        asChild
        className={buttonClassName}
        isActive={isActive}
      >
        <Link href={href} className={itemClassName}>
          <Icon className={iconClassName} />
          <span className={labelClassName}>{label}</span>
          {Number(badgeCount ?? 0) > 0 ? (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {badgeCount}
            </span>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
