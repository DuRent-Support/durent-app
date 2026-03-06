import {
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { House, Sparkles } from "lucide-react";
import Link from "next/link";

export default function AppSidebarContent() {
  return (
    <SidebarContent className="py-2">
      <SidebarMenu>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton asChild className="h-auto">
            <Link
              href="/"
              className="flex flex-col items-center gap-1.5 py-3 px-2"
            >
              <House className="h-6 w-6 shrink-0" />
              <span className="text-[11px] leading-tight text-center font-medium">
                Home
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem className="px-1">
          <SidebarMenuButton asChild className="h-auto">
            <Link
              href="/ai-scout"
              className="flex flex-col items-center gap-1.5 py-3 px-2"
            >
              <Sparkles className="h-6 w-6 shrink-0" />
              <span className="text-[11px] leading-tight text-center font-medium">
                AI Scout
              </span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarContent>
  );
}
