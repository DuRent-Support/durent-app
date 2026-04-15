"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, ShoppingCart, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import AppCard from "@/components/app-card/AppCard";
import { AppCardType } from "@/types/app-card";
import { LocationWithTags } from "@/types/location";
import { useCart } from "@/hooks/use-cart";

type SceneLocation = {
  name: string;
  city: string;
  reason: string;
};

type Scene = {
  heading: string;
  script: string;
  tags: string[];
  location: SceneLocation[];
};

const parseRecommendations = (raw: string | null): Scene[] => {
  if (!raw) return [];

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    return Array.isArray(parsed) ? (parsed as Scene[]) : [];
  } catch {
    return [];
  }
};

export default function AIScoutDetailPage() {
  const searchParams = useSearchParams();
  const { addItem } = useCart();
  const [allLocations, setAllLocations] = useState<LocationWithTags[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const recommendations = useMemo(
    () => parseRecommendations(searchParams.get("data")),
    [searchParams],
  );

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoadingLocations(true);
        const response = await fetch("/api/locations");
        const data = await response.json();

        if (response.ok) {
          setAllLocations((data.locations ?? []) as LocationWithTags[]);
        }
      } catch (error) {
        console.error("Fetch locations error:", error);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, []);

  const totalLocations = recommendations.reduce(
    (count, scene) => count + scene.location.length,
    0,
  );

  const normalize = (value: string) => value.trim().toLowerCase();

  const findMatchedLocation = (name: string, city: string) => {
    const normalizedName = normalize(name);
    const normalizedCity = normalize(city);

    return (
      allLocations.find(
        (loc) =>
          normalize(loc.shooting_location_name) === normalizedName &&
          normalize(loc.shooting_location_city) === normalizedCity,
      ) ??
      allLocations.find(
        (loc) => normalize(loc.shooting_location_name) === normalizedName,
      )
    );
  };

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button asChild variant="ghost" size="icon">
          <Link href="/ai-scout" aria-label="Kembali ke AI Scout">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Detail Rekomendasi
          </h1>
          <p className="text-sm text-muted-foreground">
            {recommendations.length} scene • {totalLocations} lokasi ditemukan
          </p>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Belum ada data rekomendasi. Kembali ke AI Scout untuk membuat
            rekomendasi baru.
          </p>
          <Button asChild className="mt-4">
            <Link href="/ai-scout">Ke AI Scout</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {recommendations.map((scene, i) => {
            return (
              <section key={`${scene.heading}-${i}`}>
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-primary text-primary-foreground text-xs font-bold">
                      {i + 1}
                    </span>
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      {scene.heading}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground ml-8">
                    {scene.script}
                  </p>
                  {scene.tags?.length > 0 && (
                    <div className="ml-8 mt-3 flex items-center gap-1.5 flex-wrap">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {scene.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {loadingLocations ? (
                  <div className="ml-8 rounded-xl border bg-card p-6 flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memuat card lokasi...
                  </div>
                ) : scene.location.length > 0 ? (
                  <div className="mt-4 grid gap-6 ml-8 sm:grid-cols-2 lg:grid-cols-3">
                    {scene.location.map((aiLoc, li) => {
                      const dbLoc = findMatchedLocation(aiLoc.name, aiLoc.city);
                      return dbLoc ? (
                        <AppCard
                          key={dbLoc.shooting_location_id}
                          type={AppCardType.Location}
                          name={dbLoc.shooting_location_name}
                          city={dbLoc.shooting_location_city}
                          price={dbLoc.shooting_location_price}
                          description={dbLoc.shooting_location_description}
                          area={dbLoc.shooting_location_area}
                          imageUrl={dbLoc.shooting_location_image_url?.[0]}
                          pax={dbLoc.shooting_location_pax}
                          rating={dbLoc.shooting_location_rate}
                          tags={dbLoc.tags}
                          action={
                            <Button
                              type="button"
                              className="w-full"
                              onClick={() =>
                                addItem({
                                  id: dbLoc.shooting_location_id,
                                  itemType: "location",
                                  name: dbLoc.shooting_location_name,
                                  subtitle: dbLoc.shooting_location_city,
                                  price: dbLoc.shooting_location_price,
                                  imageUrl:
                                    dbLoc.shooting_location_image_url?.[0] ??
                                    "/placeholder_durent.webp",
                                  tags: dbLoc.tags,
                                  requiresDateRange: true,
                                })
                              }
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Tambah ke Keranjang
                            </Button>
                          }
                        />
                      ) : (
                        <AppCard
                          key={li}
                          type={AppCardType.Location}
                          name={aiLoc.name}
                          city={aiLoc.city}
                          description={aiLoc.reason}
                          price="Hubungi kami"
                          area={0}
                          pax={0}
                          rating={null}
                          tags={[]}
                          action={
                            <Button
                              asChild
                              type="button"
                              variant="secondary"
                              className="w-full"
                            >
                              <Link
                                href="https://wa.me/628111029064"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Konsultasi via WhatsApp
                              </Link>
                            </Button>
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="ml-8 rounded-xl border border-dashed bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                      Belum ada lokasi katalog yang cocok untuk scene ini.
                    </p>
                    <Button asChild size="sm" className="mt-3 w-full sm:w-auto">
                      <Link
                        href="https://wa.me/628111029064"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Hubungi kami untuk konsultasi lebih lanjut
                      </Link>
                    </Button>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
