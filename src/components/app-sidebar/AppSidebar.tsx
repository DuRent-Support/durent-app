import { Sidebar } from "@/components/ui/sidebar";

import AppSidebarMobile from "./AppSidebarMobile";
import AppSidebarHeader from "./AppSidebarHeader";
import AppSidebarContent from "./AppSidebarContent";
import AppSidebarFooter from "./AppSidebarFooter";

export function AppSidebar() {
  return (
    <>
      <div className="hidden md:block">
        <Sidebar
          variant="floating"
          collapsible="none"
          className="fixed z-20 h-[calc(100vh-1rem)] w-20 m-2 rounded-lg border bg-sidebar/10 backdrop-blur-md"
        >
          <AppSidebarHeader />
          <AppSidebarContent />
          <AppSidebarFooter />
        </Sidebar>
      </div>

      <AppSidebarMobile />
    </>
  );
}
