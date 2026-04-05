import { ChevronDown } from "lucide-react";

import { CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroupLabel } from "@/components/ui/sidebar";

type SidebarCollapsibleTriggerProps = {
  label: string;
};

export default function SidebarCollapsibleTrigger({
  label,
}: SidebarCollapsibleTriggerProps) {
  return (
    <SidebarGroupLabel asChild>
      <CollapsibleTrigger className="flex w-full items-center justify-between px-2">
        {label}
        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=closed]/collapsible:rotate-[-90deg]" />
      </CollapsibleTrigger>
    </SidebarGroupLabel>
  );
}
