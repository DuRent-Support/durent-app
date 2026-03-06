import { Sidebar } from "@/components/ui/sidebar";

import AppSidebarHeader from "./AppSidebarHeader";
import AppSidebarContent from "./AppSidebarContent";
import AppSidebarFooter from "./AppSidebarFooter";

export function AppSidebar() {
  return (
    <Sidebar
      variant="floating"
      collapsible="none"
      className="fixed z-20 w-16 h-[calc(100vh-1rem)] m-2 rounded-lg border bg-sidebar/10 backdrop-blur-md"
    >
      <AppSidebarHeader />
      <AppSidebarContent />
      <AppSidebarFooter />
    </Sidebar>
  );
}
