"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import AppCard from "@/components/app-card/AppCard";
import CartDefaultDateRangePicker from "@/components/cart/CartDefaultDateRangePicker";
import { Input } from "@/components/ui/input";
import { AppCardType } from "@/types/app-card";
import type { Location } from "@/types/location";

type LocationApiResponse = {
  locations?: Location[];
  error?: string;
};

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
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

  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return locations.filter((location) => {
      const matchName =
        !query || location.shooting_location_name.toLowerCase().includes(query);

      return matchName;
    });
  }, [locations, searchQuery]);

  return (
    <main className="p-6 md:p-8">
      <section className="w-full ">
        <div className="mb-6 flex flex-col gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Catalog Locations
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Jelajahi semua lokasi, cari berdasarkan nama, lalu tambahkan ke
            cart.
          </p>
        </div>

        <div className="mb-4 rounded-xl ">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex min-w-0 flex-col gap-2 md:basis-1/2 flex-1">
              <p className="text-sm font-medium text-foreground">
                Cari berdasarkan Nama Lokasi
              </p>
              <div className="relative border  border-white rounded-xl">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari berdasarkan nama lokasi"
                  className="pl-10 border-0 rounded-xl"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-2 md:basis-1/2 flex-1">
              <p className="text-sm font-medium text-foreground">
                Tanggal default checkout
              </p>
              <CartDefaultDateRangePicker className="mb-0" />
            </div>
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredLocations.map((location) => {
              const locationId = location.shooting_location_id;
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
                  imageUrl={primaryImage}
                  cartItem={{
                    id: locationId,
                    itemType: "location",
                    name: location.shooting_location_name,
                    subtitle: location.shooting_location_city,
                    price: location.shooting_location_price,
                    imageUrl: primaryImage || "/placeholder_durent.webp",
                    requiresDateRange: true,
                  }}
                />
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
