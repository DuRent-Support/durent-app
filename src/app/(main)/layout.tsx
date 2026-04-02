"use client";

import { AppSidebar } from "@/components/app-sidebar/AppSidebar";
import AppHeader from "@/components/app-header/AppHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/providers/AuthProvider";

function SidebarLoadingSkeleton() {
  return (
    <>
      <aside className="fixed left-0 top-16 z-30 hidden h-[calc(100svh-4rem)] w-64 border-r border-border/60 bg-sidebar md:block">
        <div className="space-y-4 px-3 py-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </header>
    </>
  );
}

function MainContentLoadingSkeleton() {
  return (
    <div className="flex-1 space-y-6 px-6 py-6 md:px-10 md:py-8 md:pl-[18rem]">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>

      <div className="rounded-xl border border-border/40 p-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[85%]" />
        </div>
      </div>
    </div>
  );
}

function MainLayoutFrame({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const isLoading = status === "loading";

  return (
    <>
      <AppHeader />

      {isLoading ? <SidebarLoadingSkeleton /> : <AppSidebar />}

      <main className={`relative flex min-h-svh w-full flex-col pt-16`}>
        <div className="flex-1">
          {isLoading ? <MainContentLoadingSkeleton /> : children}
        </div>

        <footer className="flex items-center justify-center gap-2 border-t border-border/30 px-6 py-4 text-sm text-muted-foreground">
          <span>Ada pertanyaan?</span>
          <a
            href="https://wa.me/628111029064"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
          >
            Hubungi Kami via WhatsApp
          </a>
        </footer>
      </main>
    </>
  );
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AuthProvider>
        <MainLayoutFrame>{children}</MainLayoutFrame>
      </AuthProvider>
    </SidebarProvider>
  );
}
