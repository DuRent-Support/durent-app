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

type CrewApiItem = {
  crew_id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  skills: Record<string, unknown> | unknown[];
};

type CrewApiResponse = {
  crews?: CrewApiItem[];
  message?: string;
};

function getPrimaryImage(item: CrewApiItem) {
  const firstImage = Array.isArray(item.images) ? item.images[0] : null;
  if (!firstImage) return "/hero.webp";
  return String(firstImage);
}

function parseSkillTags(skills: CrewApiItem["skills"]) {
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
}

export default function CrewsPage() {
  const router = useRouter();
  const { addItem, isInCart } = useCart();
  const [items, setItems] = useState<CrewApiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("Semua");
  const [errorMessage, setErrorMessage] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/crews", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as CrewApiResponse;

      if (response.ok) {
        setItems(Array.isArray(data.crews) ? data.crews : []);
      } else {
        setItems([]);
        setErrorMessage(data.message || "Gagal mengambil data crew.");
      }
    } catch (error) {
      console.error("Fetch crews error:", error);
      setItems([]);
      setErrorMessage("Terjadi kesalahan saat mengambil data crew.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const skillFilters = useMemo(() => {
    const skillSet = new Set<string>();
    items.forEach((item) => {
      parseSkillTags(item.skills).forEach((skill) => {
        if (skill) skillSet.add(skill);
      });
    });

    return [
      "Semua",
      ...Array.from(skillSet).sort((a, b) => a.localeCompare(b)),
    ];
  }, [items]);

  const filteredCrews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchName = String(item.name ?? "")
        .toLowerCase()
        .includes(query);
      const tags = parseSkillTags(item.skills);
      const matchSkill =
        selectedSkill === "Semua" ||
        tags.some(
          (skill) => skill.toLowerCase() === selectedSkill.toLowerCase(),
        );
      return matchName && matchSkill;
    });
  }, [items, searchQuery, selectedSkill]);

  const addCrewToCart = (crew: CrewApiItem) => {
    const thumb = getPrimaryImage(crew);
    addItem({
      id: String(crew.crew_id),
      itemType: "crew",
      name: crew.name,
      subtitle: "Crew",
      price: crew.price,
      imageUrl: thumb,
      tags: parseSkillTags(crew.skills),
      requiresDateRange: false,
    });
    // router.push("/cart");
  };

  return (
    <>
      <main className="px-4 py-8 md:px-6 md:py-10">
        <section className="mx-auto w-full max-w-7xl">
          <div className="mb-6 flex flex-col gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Catalog Crews
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              Pilih crew terbaik untuk mendukung kebutuhan produksi Anda.
            </p>
          </div>

          <div className="mb-4 rounded-xl border border-border bg-card p-3 md:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari crew berdasarkan nama"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {skillFilters.map((skillName) => (
                <Button
                  key={skillName}
                  type="button"
                  size="sm"
                  variant={
                    selectedSkill === skillName ? "default" : "secondary"
                  }
                  onClick={() => setSelectedSkill(skillName)}
                >
                  {skillName}
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
          ) : filteredCrews.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Belum ada data crew atau hasil pencarian kosong.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredCrews.map((crew) => {
                const thumb = getPrimaryImage(crew);
                const added = isInCart(String(crew.crew_id), "crew");
                const skills = parseSkillTags(crew.skills);

                return (
                  <div key={crew.crew_id} className="group w-full">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                      <Image
                        src={thumb}
                        alt={crew.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    <div className="pb-1 pt-2.5 sm:pt-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground sm:text-base">
                          {crew.name}
                        </h3>
                        <span className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
                          {formatPrice(crew.price)}
                        </span>
                      </div>

                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                        {crew.description}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {skills.slice(0, 3).map((skill) => (
                          <Badge
                            key={`${crew.crew_id}-${skill}`}
                            variant="secondary"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="mt-3 w-full sm:mt-4"
                      variant={added ? "secondary" : "default"}
                      onClick={() => addCrewToCart(crew)}
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
    </>
  );
}
