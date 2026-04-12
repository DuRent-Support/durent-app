"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import AppCard from "@/components/app-card/AppCard";
import CartDefaultDateRangePicker from "@/components/cart/CartDefaultDateRangePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { AppCardType } from "@/types/app-card";
import type { LocationWithTags } from "@/types/location";

type LocationApiResponse = {
  locations?: LocationWithTags[];
  error?: string;
};

export default function LocationsPage() {
  const { addItem, isInCart } = useCart();
  const [locations, setLocations] = useState<LocationWithTags[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedTag, setSelectedTag] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchLocations = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/locations", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as LocationApiResponse;

      if (!response.ok) {
        setLocations([]);
        setErrorMessage(data.error || "Gagal mengambil data lokasi.");
        return;
      }

      setLocations(Array.isArray(data.locations) ? data.locations : []);
    } catch (error) {
      console.error("Fetch locations error:", error);
      setLocations([]);
      setErrorMessage("Terjadi kesalahan saat mengambil data lokasi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLocations();
  }, [fetchLocations]);

  const tags = useMemo(() => {
    const tagSet = new Set<string>();
    locations.forEach((location) => {
      location.tags.forEach((tag) => {
        const normalized = String(tag).trim();
        if (normalized) {
          tagSet.add(normalized);
        }
      });
    });

    return ["Semua", ...Array.from(tagSet).sort((a, b) => a.localeCompare(b))];
  }, [locations]);

  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return locations.filter((location) => {
      const matchTag =
        selectedTag === "Semua" ||
        location.tags.some(
          (tag) => tag.toLowerCase() === selectedTag.toLowerCase(),
        );

      const matchName =
        !query || location.shooting_location_name.toLowerCase().includes(query);

      return matchTag && matchName;
    });
  }, [locations, searchQuery, selectedTag]);

  return (
    <main className="px-4 py-8 md:px-6 md:py-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Catalog Locations
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Jelajahi semua lokasi, filter berdasarkan tags, cari berdasarkan
            nama, lalu tambahkan ke cart.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-3 md:p-4">
          <CartDefaultDateRangePicker className="mb-3" />

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari berdasarkan nama lokasi"
              className="pl-10"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Button
                key={tag}
                type="button"
                size="sm"
                variant={selectedTag === tag ? "default" : "secondary"}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </Button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-border">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          </div>
        ) : errorMessage ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Lokasi tidak ditemukan untuk filter atau pencarian saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredLocations.map((location) => {
              const locationId = location.shooting_location_id;
              const isAdded = isInCart(locationId, "location");
              const primaryImage =
                location.shooting_location_image_url?.[0] || null;

              return (
                <AppCard
                  key={locationId}
                  type={AppCardType.Location}
                  name={location.shooting_location_name}
                  city={location.shooting_location_city}
                  price={location.shooting_location_price}
                  description={location.shooting_location_description}
                  area={location.shooting_location_area}
                  pax={location.shooting_location_pax}
                  rating={location.shooting_location_rate}
                  tags={location.tags}
                  imageUrl={primaryImage}
                  action={
                    <Button
                      type="button"
                      className="w-full"
                      variant={isAdded ? "secondary" : "default"}
                      onClick={() =>
                        addItem({
                          id: locationId,
                          itemType: "location",
                          name: location.shooting_location_name,
                          subtitle: location.shooting_location_city,
                          price: location.shooting_location_price,
                          imageUrl: primaryImage || "/hero.webp",
                          tags: location.tags,
                          requiresDateRange: true,
                        })
                      }
                    >
                      {isAdded ? "Sudah di keranjang" : "Tambah ke keranjang"}
                    </Button>
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
