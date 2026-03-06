import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import Image from "next/image";

export default function AppSidebarHeader() {
  return (
    <SidebarHeader className="py-4">
      <SidebarMenu>
        <SidebarMenuItem>
          <div className="w-12 h-12 mx-auto bg-foreground rounded-xl flex items-center justify-center">
            <Image
              src="/durent-black.webp"
              alt="Logo"
              width={28}
              height={28}
              className="w-7 h-7"
            />
          </div>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}
