import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

import AppCard from "@/components/app-card/AppCard";

export default function HomePage() {
  return (
    <main>
      <div className="relative h-[340px] overflow-hidden">
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 text-center">
            FIND YOUR SET
          </h1>
          {/* Search Bar */}
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Cari lokasi syuting impianmu... "
              className="w-full pl-11 pr-24 py-6 bg-background/80 backdrop-blur-md border-border"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
              Cari
            </button>
          </div>
        </div>
      </div>

      {/* filter section */}
      <div className="flex gap-2 mt-8 justify-center">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
          Semua
        </Button>
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          Indoor
        </Button>
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          Outdoor
        </Button>
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          Studio
        </Button>
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          Klasik
        </Button>
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          Modern
        </Button>
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          Urban
        </Button>
        <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
          Nature
        </Button>
      </div>

      <div className="flex flex-wrap justify-around mt-8">
        <AppCard />
        <AppCard />
        <AppCard />
        <AppCard />
        <AppCard />
        <AppCard />
        <AppCard />
        <AppCard />
      </div>
    </main>
  );
}
