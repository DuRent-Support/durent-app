"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";

import AppCard from "@/components/app-card/AppCard";
import CartDefaultDateRangePicker from "@/components/cart/CartDefaultDateRangePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppCardType } from "@/types/app-card";

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
  if (!firstImage) return "/placeholder_durent.webp";
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
    return ["Semua", ...Array.from(skillSet).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filteredCrews = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchName = String(item.name ?? "").toLowerCase().includes(query);
      const tags = parseSkillTags(item.skills);
      const matchSkill =
        selectedSkill === "Semua" ||
        tags.some((skill) => skill.toLowerCase() === selectedSkill.toLowerCase());
      return matchName && matchSkill;
    });
  }, [items, searchQuery, selectedSkill]);

  return (
    <main className="p-6 md:p-8">
      <section className="w-full">
        <div className="mb-6 flex flex-col gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Catalog Crews
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Pilih crew terbaik untuk mendukung kebutuhan produksi Anda.
          </p>
        </div>

        <div className="mb-4 rounded-xl">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:basis-1/2">
              <p className="text-sm font-medium text-foreground">
                Cari berdasarkan nama crew
              </p>
              <div className="relative rounded-xl border border-white">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari crew berdasarkan nama"
                  className="rounded-xl border-0 pl-10"
                />
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2 md:basis-1/2">
              <p className="text-sm font-medium text-foreground">
                Tanggal default checkout
              </p>
              <CartDefaultDateRangePicker className="mb-0" />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {skillFilters.map((skillName) => (
              <Button
                key={skillName}
                type="button"
                size="sm"
                variant={selectedSkill === skillName ? "default" : "secondary"}
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredCrews.map((crew) => {
              const crewId = String(crew.crew_id);
              return (
                <AppCard
                  key={crewId}
                  type={AppCardType.Crew}
                  name={crew.name}
                  description={crew.description}
                  price={crew.price}
                  skills={parseSkillTags(crew.skills)}
                  imageUrl={getPrimaryImage(crew)}
                  cartItem={{
                    id: crewId,
                    itemType: "crew",
                    name: crew.name,
                    subtitle: "Crew",
                    price: crew.price,
                    imageUrl: getPrimaryImage(crew),
                    tags: parseSkillTags(crew.skills),
                    requiresDateRange: false,
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
