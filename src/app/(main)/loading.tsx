import { Skeleton } from "@/components/ui/skeleton";

export default function MainSegmentLoading() {
  return (
    <div className="flex min-h-svh w-full">
      <div className="fixed z-20 m-2 hidden h-[calc(100vh-1rem)] w-20 rounded-lg border bg-sidebar/10 p-2 backdrop-blur-md md:block">
        <div className="flex h-full flex-col items-center justify-between py-2">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-border/60 bg-background/95 px-4 backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-10 rounded-md" />
      </header>

      <main className="relative flex min-h-svh w-full flex-col pt-16 md:ml-24 md:w-[calc(100%-6rem)] md:pt-0">
        <div className="flex-1 space-y-5 px-6 py-6 md:px-10 md:py-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-36 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>

        <footer className="flex items-center justify-center gap-2 border-t border-border/30 px-6 py-4 text-sm text-muted-foreground">
          <span>Ada pertanyaan?</span>
          <span className="font-medium text-foreground/70">Menyiapkan akun...</span>
        </footer>
      </main>
    </div>
  );
}
