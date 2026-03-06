import { LogIn } from "lucide-react";
import Link from "next/link";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";

export default function AppSidebarFooter() {
  return (
    <SidebarFooter className="">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="">
            <Link href="/login">
              <div className="flex justify-center items-center rounded-lg w-12 h-12 ">
                <LogIn className="w-5 h-5" />
              </div>
            </Link>
            {/* <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar> */}
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
