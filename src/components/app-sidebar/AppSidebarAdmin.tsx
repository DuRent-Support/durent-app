import { Sidebar } from "@/components/ui/sidebar";

import AppSidebarAdminMobile from "./AppSidebarAdminMobile";
import AppSidebarHeader from "./AppSidebarHeader";
import AppSidebarAdminContent from "./AppSidebarAdminContent";
import AppSidebarFooter from "./AppSidebarFooter";

export function AppSidebarAdmin() {
  return (
    <>
      <div className="hidden md:block">
        <Sidebar
          variant="floating"
          collapsible="none"
          className="fixed z-20 h-[calc(100vh-1rem)] w-20 m-2 rounded-lg border bg-sidebar/10 backdrop-blur-md"
        >
          <AppSidebarHeader />
          <AppSidebarAdminContent />
          <AppSidebarFooter />
        </Sidebar>
      </div>

      <AppSidebarAdminMobile />
    </>
  );
}
