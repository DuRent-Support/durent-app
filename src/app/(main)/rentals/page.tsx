"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, ShoppingBag } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import formatPrice from "@/lib/formatPrice";

type RentalRelation = {
  id: number;
  name: string;
  short_code: string;
};

type RentalImage = {
  id: number;
  url: string;
  preview_url: string | null;
  position: number;
};

type RentalItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  specifications: Record<string, string>;
  item_categories: RentalRelation[];
  item_sub_categories: RentalRelation[];
  images: RentalImage[];
};

type RentalApiResponse = {
  rentals?: RentalItem[];
  message?: string;
};

function getPrimaryImage(item: RentalItem) {
  const firstImage = (item.images ?? [])[0];
  if (!firstImage) return "/hero.webp";
  return String(firstImage.preview_url || firstImage.url || "/hero.webp");
}

export default function RentalsPage() {
  const router = useRouter();
  const { addItem, isInCart } = useCart();
  const [items, setItems] = useState<RentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/rentals", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as RentalApiResponse;

      if (!response.ok) {
        setItems([]);
        setErrorMessage(data.message || "Gagal mengambil data rental.");
        return;
      }

      setItems(Array.isArray(data.rentals) ? data.rentals : []);
    } catch (error) {
      console.error("Fetch rentals error:", error);
      setItems([]);
      setErrorMessage("Terjadi kesalahan saat mengambil data rental.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    items.forEach((item) => {
      item.item_categories.forEach((category) => {
        const normalized = String(category.name ?? "").trim();
        if (normalized) {
          categorySet.add(normalized);
        }
      });
    });

    return [
      "Semua",
      ...Array.from(categorySet).sort((a, b) => a.localeCompare(b)),
    ];
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return items.filter((item) => {
      const itemName = String(item.name ?? "").toLowerCase();
      const itemDescription = String(item.description ?? "").toLowerCase();
      const matchNameOrDescription =
        !query || itemName.includes(query) || itemDescription.includes(query);

      const matchCategory =
        selectedCategory === "Semua" ||
        item.item_categories.some(
          (category) =>
            String(category.name ?? "").toLowerCase() ===
            selectedCategory.toLowerCase(),
        );

      return matchNameOrDescription && matchCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const addToCart = (item: RentalItem) => {
    addItem({
      id: String(item.id),
      itemType: "rental",
      name: item.name,
      subtitle: "Rental",
      price: item.price,
      imageUrl: getPrimaryImage(item),
      tags: item.item_categories.map((category) => category.name),
      requiresDateRange: false,
    });
    // router.push("/cart");
  };

  return (
    <main className="px-4 py-8 md:px-6 md:py-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Catalog Rentals
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Pilih item rental terbaik untuk kebutuhan produksi Anda.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama atau deskripsi rental"
              className="pl-10"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                type="button"
                size="sm"
                variant={
                  selectedCategory === category ? "default" : "secondary"
                }
                onClick={() => setSelectedCategory(category)}
              >
                {category}
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
        ) : filteredItems.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Rental tidak ditemukan untuk filter atau pencarian saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const added = isInCart(String(item.id), "rental");
              return (
                <div key={item.id} className="group w-full">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                    <Image
                      src={getPrimaryImage(item)}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  <div className="pb-1 pt-2.5 sm:pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="line-clamp-2 text-sm font-bold leading-tight text-foreground sm:text-base">
                        {item.name}
                      </h2>
                      <span className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
                        {formatPrice(item.price)}
                      </span>
                    </div>

                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                      {item.description}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {item.item_sub_categories.slice(0, 3).map((category) => (
                        <Badge
                          key={`${item.id}-${category.id}`}
                          variant="secondary"
                        >
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="mt-3 w-full sm:mt-4"
                    variant={added ? "secondary" : "default"}
                    onClick={() => addToCart(item)}
                  >
                    {added ? (
                      <>
                        <Check className="h-4 w-4" />
                        Sudah di keranjang
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        Tambah ke keranjang
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
