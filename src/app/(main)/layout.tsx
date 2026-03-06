import { AppSidebar } from "@/components/app-sidebar/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import Image from "next/image";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Background Image */}
      <div className="absolute top-0 left-0 right-0 h-[340px] z-0">
        <Image
          src="/hero.webp"
          alt="Background"
          className="h-full w-full object-cover"
          fill
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      </div>

      <SidebarProvider>
        <AppSidebar />
        <main className="relative z-10 ml-20 w-[calc(100%-5rem)]">
          {children}
        </main>
      </SidebarProvider>
    </>
  );
}
