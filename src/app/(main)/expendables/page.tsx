"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import AppCard from "@/components/app-card/AppCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { AppCardType } from "@/types/app-card";
import type { Expendable } from "@/types";

type ExpendableApiResponse = {
  items?: Expendable[];
  message?: string;
};

function getPrimaryImage(item: Expendable) {
  const firstImage = (item.images ?? [])[0];
  if (!firstImage) return "/hero.webp";
  return String(firstImage.preview_url || firstImage.url || "/hero.webp");
}

export default function ExpendablesPage() {
  const { addItem, isInCart } = useCart();
  const [items, setItems] = useState<Expendable[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/expendables", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as ExpendableApiResponse;

      if (!response.ok) {
        setItems([]);
        setErrorMessage(data.message || "Gagal mengambil data expendables.");
        return;
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (error) {
      console.error("Fetch expendables error:", error);
      setItems([]);
      setErrorMessage("Terjadi kesalahan saat mengambil data expendables.");
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

  const addToCart = (item: Expendable) => {
    const firstImage = getPrimaryImage(item);
    addItem({
      id: String(item.id),
      itemType: "expendable",
      name: item.name,
      subtitle: "Expendable",
      price: item.price,
      imageUrl: firstImage,
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
            Catalog Expendables
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Pilih kebutuhan expendables untuk mendukung operasional produksi
            secara praktis.
          </p>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-card p-3 md:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari nama atau deskripsi expendables"
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
            Expendables tidak ditemukan untuk filter atau pencarian saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map((item) => {
              const itemId = String(item.id);
              const added = isInCart(itemId, "expendable");
              return (
                <AppCard
                  key={itemId}
                  type={AppCardType.Expendable}
                  name={item.name}
                  description={item.description}
                  price={item.price}
                  imageUrl={getPrimaryImage(item)}
                  action={
                    <Button
                      type="button"
                      className="w-full"
                      variant={added ? "secondary" : "default"}
                      onClick={() => addToCart(item)}
                    >
                      {added ? "Sudah di keranjang" : "Tambah ke keranjang"}
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
