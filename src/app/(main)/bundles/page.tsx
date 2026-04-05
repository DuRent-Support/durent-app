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
import type { Bundle } from "@/types";

type BundleApiResponse = {
  items?: Bundle[];
  message?: string;
};

function getPrimaryImage(item: Bundle) {
  const firstImage = (item.images ?? [])[0];
  if (!firstImage) return "/hero.webp";
  return String(firstImage.preview_url || firstImage.url || "/hero.webp");
}

export default function BundlesPage() {
  const router = useRouter();
  const { addItem, isInCart } = useCart();
  const [items, setItems] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/bundles", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as BundleApiResponse;

      if (!response.ok) {
        setItems([]);
        setErrorMessage(data.message || "Gagal mengambil data bundles.");
        return;
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("Fetch bundles error:", error);
      setItems([]);
      setErrorMessage("Terjadi kesalahan saat mengambil data bundles.");
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
      item.bundle_categories.forEach((category) => {
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
        item.bundle_categories.some(
          (category) =>
            String(category.name ?? "").toLowerCase() ===
            selectedCategory.toLowerCase(),
        );

      return matchNameOrDescription && matchCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  const addToCart = (item: Bundle) => {
    const firstImage = getPrimaryImage(item);
    addItem({
      id: String(item.id),
      itemType: "bundle",
      name: item.name,
      subtitle: "Bundle",
      price: item.final_price,
      imageUrl: firstImage,
      tags: item.bundle_categories.map((category) => category.name),
      requiresDateRange: false,
    });
    // router.push("/cart");
  };

  return (
    <main className="px-4 py-8 md:px-6 md:py-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-col gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Catalog Bundles
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Jelajahi paket bundling siap pakai agar kebutuhan produksi lebih
            efisien dan hemat biaya.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama atau deskripsi bundles"
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
            Bundles tidak ditemukan untuk filter atau pencarian saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) =>
              (() => {
                const added = isInCart(String(item.id), "bundle");
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
                        <div className="text-right">
                          <p className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
                            {formatPrice(item.final_price)}
                          </p>
                          {item.base_price > item.final_price ? (
                            <p className="text-[11px] text-muted-foreground line-through">
                              {formatPrice(item.base_price)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                        {item.description}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {item.bundle_types.slice(0, 1).map((type) => (
                          <Badge key={`${item.id}-type-${type.id}`}>
                            {type.name}
                          </Badge>
                        ))}
                        {item.bundle_categories.slice(0, 2).map((category) => (
                          <Badge
                            key={`${item.id}-category-${category.id}`}
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
              })(),
            )}
          </div>
        )}
      </section>
    </main>
  );
}
