"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  MapPin,
  TrendingUp,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import AppCard from "@/components/app-card/AppCard";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AppCardType } from "@/types/app-card";
import { useCart } from "@/hooks/use-cart";
import type { Bundle } from "@/types/bundle";
import type { Crew } from "@/types/crew";
import type { Expendable } from "@/types/expendable";
import type { FoodAndBeverage } from "@/types/food-and-beverage";
import type { LocationWithTags } from "@/types/location";

type LocationsResponse = {
  locations?: LocationWithTags[];
  error?: string;
};

type CrewsResponse = {
  crews?: Crew[];
  message?: string;
};

type FoodAndBeverageResponse = {
  items?: FoodAndBeverage[];
  message?: string;
};

type RentalRelation = {
  id: number;
  name: string;
  short_code?: string;
};

type RentalImage = {
  id?: number;
  url: string;
  preview_url?: string | null;
  position: number;
};

type RentalItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  item_categories: RentalRelation[];
  item_sub_categories: RentalRelation[];
  images: RentalImage[];
};

type RentalsResponse = {
  rentals?: RentalItem[];
  message?: string;
};

type ExpendablesResponse = {
  items?: Expendable[];
  message?: string;
};

type BundlesResponse = {
  items?: Bundle[];
  message?: string;
};

const fallbackImage = "/placeholder_durent.webp";

const getLocationImage = (location: LocationWithTags) =>
  location.shooting_location_image_url?.[0] || fallbackImage;

const getPrimaryImage = (
  images: Array<{ url: string; preview_url?: string | null }>,
) => {
  const first = images?.[0];
  if (!first) return fallbackImage;
  return String(first.preview_url || first.url || fallbackImage);
};

const parseSkillTags = (skills: Crew["skills"]) => {
  if (Array.isArray(skills)) {
    return skills
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (
          entry &&
          typeof entry === "object" &&
          "name" in (entry as Record<string, unknown>)
        ) {
          return String((entry as Record<string, unknown>).name ?? "");
        }
        return "";
      })
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (skills && typeof skills === "object") {
    return Object.keys(skills)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [] as string[];
};

const getFnbTagNames = (item: FoodAndBeverage) => {
  const tags = (
    item as FoodAndBeverage & { tags?: Array<{ name?: string | null }> }
  ).tags;

  if (!Array.isArray(tags)) {
    return [] as string[];
  }

  return tags
    .map((tag) => String(tag?.name ?? "").trim())
    .filter((name) => name.length > 0);
};

const ExplorePage = () => {
  const router = useRouter();
  const { addItem, isInCart } = useCart();
  const [locations, setLocations] = useState<LocationWithTags[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [fnbs, setFnbs] = useState<FoodAndBeverage[]>([]);
  const [rentals, setRentals] = useState<RentalItem[]>([]);
  const [expendables, setExpendables] = useState<Expendable[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchHubData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const [
        locationsResponse,
        crewsResponse,
        fnbResponse,
        rentalsResponse,
        expendablesResponse,
        bundlesResponse,
      ] = await Promise.all([
        fetch("/api/locations", { method: "GET", cache: "no-store" }),
        fetch("/api/crews", { method: "GET", cache: "no-store" }),
        fetch("/api/food-and-beverage", { method: "GET", cache: "no-store" }),
        fetch("/api/rentals", { method: "GET", cache: "no-store" }),
        fetch("/api/expendables", { method: "GET", cache: "no-store" }),
        fetch("/api/bundles", { method: "GET", cache: "no-store" }),
      ]);

      const [
        locationsData,
        crewsData,
        fnbData,
        rentalsData,
        expendablesData,
        bundlesData,
      ] = await Promise.all([
        locationsResponse.json() as Promise<LocationsResponse>,
        crewsResponse.json() as Promise<CrewsResponse>,
        fnbResponse.json() as Promise<FoodAndBeverageResponse>,
        rentalsResponse.json() as Promise<RentalsResponse>,
        expendablesResponse.json() as Promise<ExpendablesResponse>,
        bundlesResponse.json() as Promise<BundlesResponse>,
      ]);

      setLocations(
        locationsResponse.ok && Array.isArray(locationsData.locations)
          ? locationsData.locations
          : [],
      );
      setCrews(
        crewsResponse.ok && Array.isArray(crewsData.crews)
          ? crewsData.crews
          : [],
      );
      setFnbs(
        fnbResponse.ok && Array.isArray(fnbData.items) ? fnbData.items : [],
      );
      setRentals(
        rentalsResponse.ok && Array.isArray(rentalsData.rentals)
          ? rentalsData.rentals
          : [],
      );
      setExpendables(
        expendablesResponse.ok && Array.isArray(expendablesData.items)
          ? expendablesData.items
          : [],
      );
      setBundles(
        bundlesResponse.ok && Array.isArray(bundlesData.items)
          ? bundlesData.items
          : [],
      );

      if (
        !locationsResponse.ok ||
        !crewsResponse.ok ||
        !fnbResponse.ok ||
        !rentalsResponse.ok ||
        !expendablesResponse.ok ||
        !bundlesResponse.ok
      ) {
        setErrorMessage("Sebagian data gagal dimuat. Coba muat ulang.");
      }
    } catch (error) {
      console.error("Fetch hub data error:", error);
      setErrorMessage("Terjadi kesalahan saat mengambil data hub.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHubData();
  }, [fetchHubData]);

  const filteredLocations = useMemo(() => locations, [locations]);

  const recommendedItems = useMemo(() => {
    const topLocations = [...locations]
      .sort((a, b) => b.shooting_location_rate - a.shooting_location_rate)
      .slice(0, 3)
      .map((location) => ({ type: "location" as const, location }));
    const topCrews = crews.slice(0, 2).map((crew) => ({
      type: "crew" as const,
      crew,
    }));
    return [...topLocations, ...topCrews];
  }, [locations, crews]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-[320px] overflow-hidden">
        <Image
          src="/hero.webp"
          alt="Studio"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4">
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-3 text-center">
            Semua Kebutuhan Syuting
          </h1>
          <p className="text-muted-foreground text-center mb-6 max-w-lg">
            Lokasi, crew, catering, peralatan, dan paket lengkap dalam satu
            platform.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 space-y-12">
        {/* Recommended */}
        <section>
          <div className="grid grid-flow-col auto-cols-max items-center gap-2 mb-5">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold text-foreground">
              Rekomendasi Untuk Kamu
            </h2>
          </div>
          {loading ? (
            <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
              Memuat rekomendasi...
            </div>
          ) : recommendedItems.length === 0 ? (
            <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
              Rekomendasi belum tersedia.
            </div>
          ) : (
            <Carousel opts={{ align: "start" }} className="w-full px-10">
              <CarouselContent>
                {recommendedItems.map((entry, index) => (
                  <CarouselItem
                    key={`${entry.type}-${index}`}
                    className="basis-1/2 md:basis-1/3"
                  >
                    {entry.type === "location"
                      ? (() => {
                          const locationId =
                            entry.location.shooting_location_id;
                          const added = isInCart(locationId, "location");
                          return (
                            <AppCard
                              type={AppCardType.Location}
                              name={entry.location.shooting_location_name}
                              description={
                                entry.location.shooting_location_description
                              }
                              city={entry.location.shooting_location_city}
                              price={entry.location.shooting_location_price}
                              area={entry.location.shooting_location_area}
                              pax={entry.location.shooting_location_pax}
                              rating={entry.location.shooting_location_rate}
                              tags={entry.location.tags}
                              imageUrl={getLocationImage(entry.location)}
                              onClick={() => router.push("/login")}
                              action={
                                <Button
                                  type="button"
                                  className="w-full"
                                  variant={added ? "secondary" : "default"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    addItem({
                                      id: locationId,
                                      itemType: "location",
                                      name: entry.location
                                        .shooting_location_name,
                                      subtitle:
                                        entry.location.shooting_location_city,
                                      price:
                                        entry.location.shooting_location_price,
                                      imageUrl: getLocationImage(
                                        entry.location,
                                      ),
                                      tags: entry.location.tags,
                                      requiresDateRange: true,
                                    });
                                  }}
                                >
                                  {added
                                    ? "Sudah di keranjang"
                                    : "Tambah ke keranjang"}
                                </Button>
                              }
                            />
                          );
                        })()
                      : (() => {
                          const crewId = entry.crew.crew_id;
                          const added = isInCart(crewId, "crew");
                          return (
                            <AppCard
                              type={AppCardType.Crew}
                              name={entry.crew.name}
                              description={entry.crew.description}
                              price={entry.crew.price}
                              skills={parseSkillTags(entry.crew.skills).slice(
                                0,
                                3,
                              )}
                              imageUrl={entry.crew.images?.[0] || fallbackImage}
                              onClick={() => router.push("/login")}
                              action={
                                <Button
                                  type="button"
                                  className="w-full"
                                  variant={added ? "secondary" : "default"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    addItem({
                                      id: crewId,
                                      itemType: "crew",
                                      name: entry.crew.name,
                                      subtitle: "Crew",
                                      price: entry.crew.price,
                                      imageUrl:
                                        entry.crew.images?.[0] || fallbackImage,
                                      tags: parseSkillTags(entry.crew.skills),
                                      requiresDateRange: false,
                                    });
                                  }}
                                >
                                  {added
                                    ? "Sudah di keranjang"
                                    : "Tambah ke keranjang"}
                                </Button>
                              }
                            />
                          );
                        })()}
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          )}
        </section>

        {/* All Products */}
        <section>
          <div className="grid grid-flow-col auto-cols-max items-center gap-2 mb-5">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Semua Produk
            </h2>
          </div>

          {errorMessage ? (
            <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div>
            <SectionLabel
              icon={<MapPin className="h-4 w-4" />}
              label="Lokasi Syuting"
            />
            {loading ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Memuat lokasi...
              </div>
            ) : filteredLocations.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Lokasi tidak ditemukan.
              </div>
            ) : (
              <Carousel opts={{ align: "start" }} className="w-full mb-8 px-10">
                <CarouselContent>
                  {filteredLocations.slice(0, 5).map((loc) => (
                    <CarouselItem
                      key={loc.shooting_location_id}
                      className="basis-1/2 md:basis-1/3"
                    >
                      {(() => {
                        const locationId = loc.shooting_location_id;
                        const added = isInCart(locationId, "location");
                        return (
                          <AppCard
                            type={AppCardType.Location}
                            name={loc.shooting_location_name}
                            description={loc.shooting_location_description}
                            city={loc.shooting_location_city}
                            price={loc.shooting_location_price}
                            area={loc.shooting_location_area}
                            pax={loc.shooting_location_pax}
                            rating={loc.shooting_location_rate}
                            tags={loc.tags}
                            imageUrl={getLocationImage(loc)}
                            onClick={() => router.push("/login")}
                            action={
                              <Button
                                type="button"
                                className="w-full"
                                variant={added ? "secondary" : "default"}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addItem({
                                    id: locationId,
                                    itemType: "location",
                                    name: loc.shooting_location_name,
                                    subtitle: loc.shooting_location_city,
                                    price: loc.shooting_location_price,
                                    imageUrl: getLocationImage(loc),
                                    tags: loc.tags,
                                    requiresDateRange: true,
                                  });
                                }}
                              >
                                {added
                                  ? "Sudah di keranjang"
                                  : "Tambah ke keranjang"}
                              </Button>
                            }
                          />
                        );
                      })()}
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            )}
          </div>

          <div className="mt-10">
            <SectionLabel icon={<Users className="h-4 w-4" />} label="Crew" />
            {loading ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Memuat crew...
              </div>
            ) : crews.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Crew tidak ditemukan.
              </div>
            ) : (
              <Carousel opts={{ align: "start" }} className="w-full mb-8 px-10">
                <CarouselContent>
                  {crews.slice(0, 6).map((crew) => {
                    const crewId = crew.crew_id;
                    const added = isInCart(crewId, "crew");
                    return (
                      <CarouselItem
                        key={crewId}
                        className="basis-1/2 md:basis-1/3"
                      >
                        <AppCard
                          type={AppCardType.Crew}
                          name={crew.name}
                          description={crew.description}
                          price={crew.price}
                          skills={parseSkillTags(crew.skills).slice(0, 3)}
                          imageUrl={crew.images?.[0] || fallbackImage}
                          onClick={() => router.push("/login")}
                          action={
                            <Button
                              type="button"
                              className="w-full"
                              variant={added ? "secondary" : "default"}
                              onClick={(event) => {
                                event.stopPropagation();
                                addItem({
                                  id: crewId,
                                  itemType: "crew",
                                  name: crew.name,
                                  subtitle: "Crew",
                                  price: crew.price,
                                  imageUrl: crew.images?.[0] || fallbackImage,
                                  tags: parseSkillTags(crew.skills),
                                  requiresDateRange: false,
                                });
                              }}
                            >
                              {added
                                ? "Sudah di keranjang"
                                : "Tambah ke keranjang"}
                            </Button>
                          }
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            )}
          </div>

          <div className="mt-10">
            <SectionLabel
              icon={<UtensilsCrossed className="h-4 w-4" />}
              label="Food & Beverage"
            />
            {loading ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Memuat F&B...
              </div>
            ) : fnbs.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                F&B tidak ditemukan.
              </div>
            ) : (
              <Carousel opts={{ align: "start" }} className="w-full mb-8 px-10">
                <CarouselContent>
                  {fnbs.slice(0, 6).map((item) => {
                    const itemId = String(item.id);
                    const added = isInCart(itemId, "food_and_beverage");
                    return (
                      <CarouselItem
                        key={itemId}
                        className="basis-1/2 md:basis-1/3"
                      >
                        <AppCard
                          type={AppCardType.Fnb}
                          name={item.name}
                          description={item.description}
                          price={item.price}
                          fnbTags={getFnbTagNames(item).slice(0, 3)}
                          imageUrl={getPrimaryImage(item.images)}
                          onClick={() => router.push("/login")}
                          action={
                            <Button
                              type="button"
                              className="w-full"
                              variant={added ? "secondary" : "default"}
                              onClick={(event) => {
                                event.stopPropagation();
                                addItem({
                                  id: itemId,
                                  itemType: "food_and_beverage",
                                  name: item.name,
                                  subtitle: "Food & Beverage",
                                  price: item.price,
                                  imageUrl: getPrimaryImage(item.images),
                                  tags: getFnbTagNames(item),
                                  requiresDateRange: false,
                                });
                              }}
                            >
                              {added
                                ? "Sudah di keranjang"
                                : "Tambah ke keranjang"}
                            </Button>
                          }
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            )}
          </div>

          <div className="mt-10">
            <SectionLabel
              icon={<Camera className="h-4 w-4" />}
              label="Rentals"
            />
            {loading ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Memuat rental...
              </div>
            ) : rentals.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Rental tidak ditemukan.
              </div>
            ) : (
              <Carousel opts={{ align: "start" }} className="w-full mb-8 px-10">
                <CarouselContent>
                  {rentals.slice(0, 6).map((item) => {
                    const itemId = String(item.id);
                    const added = isInCart(itemId, "rental");
                    return (
                      <CarouselItem
                        key={itemId}
                        className="basis-1/2 md:basis-1/3"
                      >
                        <AppCard
                          type={AppCardType.Rental}
                          name={item.name}
                          description={item.description}
                          price={item.price}
                          imageUrl={getPrimaryImage(item.images)}
                          onClick={() => router.push("/login")}
                          action={
                            <Button
                              type="button"
                              className="w-full"
                              variant={added ? "secondary" : "default"}
                              onClick={(event) => {
                                event.stopPropagation();
                                addItem({
                                  id: itemId,
                                  itemType: "rental",
                                  name: item.name,
                                  subtitle: "Rental",
                                  price: item.price,
                                  imageUrl: getPrimaryImage(item.images),
                                  tags: item.item_categories.map(
                                    (category) => category.name,
                                  ),
                                  requiresDateRange: false,
                                });
                              }}
                            >
                              {added
                                ? "Sudah di keranjang"
                                : "Tambah ke keranjang"}
                            </Button>
                          }
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            )}
          </div>

          <div className="mt-10">
            <SectionLabel
              icon={<MapPin className="h-4 w-4" />}
              label="Expendables"
            />
            {loading ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Memuat expendables...
              </div>
            ) : expendables.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Expendables tidak ditemukan.
              </div>
            ) : (
              <Carousel opts={{ align: "start" }} className="w-full mb-8 px-10">
                <CarouselContent>
                  {expendables.slice(0, 6).map((item) => {
                    const itemId = String(item.id);
                    const added = isInCart(itemId, "expendable");
                    return (
                      <CarouselItem
                        key={itemId}
                        className="basis-1/2 md:basis-1/3"
                      >
                        <AppCard
                          type={AppCardType.Expendable}
                          name={item.name}
                          description={item.description}
                          price={item.price}
                          imageUrl={getPrimaryImage(item.images)}
                          onClick={() => router.push("/login")}
                          action={
                            <Button
                              type="button"
                              className="w-full"
                              variant={added ? "secondary" : "default"}
                              onClick={(event) => {
                                event.stopPropagation();
                                addItem({
                                  id: itemId,
                                  itemType: "expendable",
                                  name: item.name,
                                  subtitle: "Expendable",
                                  price: item.price,
                                  imageUrl: getPrimaryImage(item.images),
                                  tags: item.item_categories.map(
                                    (category) => category.name,
                                  ),
                                  requiresDateRange: false,
                                });
                              }}
                            >
                              {added
                                ? "Sudah di keranjang"
                                : "Tambah ke keranjang"}
                            </Button>
                          }
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            )}
          </div>

          <div className="mt-10">
            <SectionLabel
              icon={<TrendingUp className="h-4 w-4" />}
              label="Bundles"
            />
            {loading ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Memuat bundles...
              </div>
            ) : bundles.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
                Bundles tidak ditemukan.
              </div>
            ) : (
              <Carousel opts={{ align: "start" }} className="w-full mb-8 px-10">
                <CarouselContent>
                  {bundles.slice(0, 6).map((item) => {
                    const itemId = String(item.id);
                    const added = isInCart(itemId, "bundle");
                    return (
                      <CarouselItem
                        key={itemId}
                        className="basis-1/2 md:basis-1/3"
                      >
                        <AppCard
                          type={AppCardType.Bundle}
                          name={item.name}
                          description={item.description}
                          basePrice={item.base_price}
                          finalPrice={item.final_price}
                          imageUrl={getPrimaryImage(item.images)}
                          onClick={() => router.push("/login")}
                          action={
                            <Button
                              type="button"
                              className="w-full"
                              variant={added ? "secondary" : "default"}
                              onClick={(event) => {
                                event.stopPropagation();
                                addItem({
                                  id: itemId,
                                  itemType: "bundle",
                                  name: item.name,
                                  subtitle: "Bundle",
                                  price: item.final_price,
                                  imageUrl: getPrimaryImage(item.images),
                                  tags: item.bundle_categories.map(
                                    (category) => category.name,
                                  ),
                                  requiresDateRange: false,
                                });
                              }}
                            >
                              {added
                                ? "Sudah di keranjang"
                                : "Tambah ke keranjang"}
                            </Button>
                          }
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </Carousel>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const SectionLabel = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <div className="flex items-center gap-2 mb-4 mt-2">
    <span className="text-primary">{icon}</span>
    <h3 className="font-display text-base font-semibold text-foreground">
      {label}
    </h3>
  </div>
);

export default ExplorePage;
