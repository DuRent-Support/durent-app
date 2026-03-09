"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import AppCard from "@/components/app-card/AppCard";
import { LocationWithTags } from "@/types/location";

export default function HomePage() {
  const [locations, setLocations] = useState<LocationWithTags[]>([]);
  const [filteredLocations, setFilteredLocations] = useState<
    LocationWithTags[]
  >([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/locations");
      const data = await response.json();

      if (response.ok) {
        setLocations(data.locations || []);
        setFilteredLocations(data.locations || []);
      }
    } catch (error) {
      console.error("Fetch locations error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch("/api/tags");
      const data = await response.json();

      if (response.ok) {
        const tagNames =
          data.tags?.map((t: { tag_id: string; tag: string }) => t.tag) || [];
        setTags(["Semua", ...tagNames]);
      }
    } catch (error) {
      console.error("Fetch tags error:", error);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
    fetchTags();
  }, [fetchLocations, fetchTags]);

  useEffect(() => {
    let filtered = locations;

    // Filter by tag
    if (selectedTag !== "Semua") {
      filtered = filtered.filter((loc) => loc.tags.includes(selectedTag));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (loc) =>
          loc.shooting_location_name.toLowerCase().includes(query) ||
          loc.shooting_location_city.toLowerCase().includes(query) ||
          loc.shooting_location_description?.toLowerCase().includes(query),
      );
    }

    setFilteredLocations(filtered);
  }, [selectedTag, searchQuery, locations]);

  const handleSearch = () => {
    // Search is handled by the useEffect above
  };

  return (
    <main>
      {/* Background Image */}
      <div className="fixed top-0 left-0 right-0 h-[340px] z-0">
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
            FIND YOUR SET
          </h1>
          {/* Search Bar */}
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Cari lokasi syuting impianmu... "
              className="w-full pl-11 pr-24 py-6 bg-background/80 backdrop-blur-md border-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Cari
            </button>
          </div>
        </div>
      </div>

      {/* filter section */}
      <div className="flex gap-2 mt-8 justify-center flex-wrap px-4">
        {tags.map((tag) => (
          <Button
            key={tag}
            onClick={() => setSelectedTag(tag)}
            className={
              selectedTag === tag
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
            }
          >
            {tag}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap justify-start mt-8 gap-6 px-4 pb-8">
        {loading ? (
          <div className="flex justify-center items-center w-full py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="text-center w-full py-12 text-muted-foreground">
            Tidak ada lokasi yang ditemukan
          </div>
        ) : (
          filteredLocations.map((location) => (
            <AppCard
              key={location.shooting_location_id}
              id={location.shooting_location_id}
              name={location.shooting_location_name}
              city={location.shooting_location_city}
              price={location.shooting_location_price}
              description={location.shooting_location_description}
              area={location.shooting_location_area}
              imageUrl={location.shooting_location_image_url}
              pax={location.shooting_location_pax}
              rate={location.shooting_location_rate}
              tags={location.tags}
            />
          ))
        )}
      </div>
    </main>
  );
}
