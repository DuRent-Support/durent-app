"use client";

import Image from "next/image";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import CrewCard from "@/components/crew-card/CrewCard";
import { Input } from "@/components/ui/input";
import type { Crew } from "@/types";

export default function CrewPage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchCrews = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/crews", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as {
        crews?: Crew[];
      };

      if (!response.ok) {
        setCrews([]);
        return;
      }

      setCrews(result.crews ?? []);
    } catch (error) {
      console.error("Fetch crews error:", error);
      setCrews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCrews();
  }, [fetchCrews]);

  const filteredCrews = useMemo(() => {
    if (!searchQuery.trim()) return crews;

    const query = searchQuery.toLowerCase();

    return crews.filter((crew) => {
      const skillText = JSON.stringify(crew.skills ?? {}).toLowerCase();

      return (
        crew.name.toLowerCase().includes(query) ||
        crew.description.toLowerCase().includes(query) ||
        skillText.includes(query)
      );
    });
  }, [crews, searchQuery]);

  return (
    <main>
      <div className="fixed top-0 left-0 right-0 h-[340px] -z-10">
        <Image
          src="/hero.webp"
          alt="Background"
          className="h-full w-full object-cover"
          fill
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      </div>

      <div className="relative h-[340px] overflow-hidden z-10">
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 text-center">
            CREW
          </h1>
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Cari crew..."
              className="w-full pl-11 pr-6 py-6 bg-background/80 backdrop-blur-md border-border"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-start mt-8 gap-6 px-4 pb-8">
        {loading ? (
          <div className="flex justify-center items-center w-full py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCrews.length === 0 ? (
          <div className="text-center w-full py-12 text-muted-foreground">
            Tidak ada crew yang ditemukan
          </div>
        ) : (
          filteredCrews.map((crew) => <CrewCard key={crew.crew_id} crew={crew} />)
        )}
      </div>
    </main>
  );
}
