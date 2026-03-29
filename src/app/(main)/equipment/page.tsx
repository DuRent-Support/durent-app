"use client";

import Image from "next/image";
import { Loader2, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import EquipmentCard from "@/components/equipment-card/EquipmentCard";
import { Input } from "@/components/ui/input";
import type { Equipment } from "@/types";

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchEquipments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/equipments", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as {
        equipments?: Equipment[];
      };

      if (!response.ok) {
        setEquipments([]);
        return;
      }

      setEquipments(result.equipments ?? []);
    } catch (error) {
      console.error("Fetch equipments error:", error);
      setEquipments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEquipments();
  }, [fetchEquipments]);

  const filteredEquipments = useMemo(() => {
    if (!searchQuery.trim()) return equipments;

    const query = searchQuery.toLowerCase();

    return equipments.filter((equipment) => {
      const specsText = JSON.stringify(equipment.specs ?? {}).toLowerCase();

      return (
        equipment.name.toLowerCase().includes(query) ||
        equipment.description.toLowerCase().includes(query) ||
        specsText.includes(query)
      );
    });
  }, [equipments, searchQuery]);

  return (
    <main>
      <div className="fixed top-0 left-0 right-0 h-[340px] -z-10">
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
            EQUIPMENT
          </h1>
          <div className="relative w-full max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Cari equipment..."
              className="w-full pl-11 pr-6 py-6 bg-background/80 backdrop-blur-md border-border"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap justify-start mt-8 gap-6 px-4 pb-8">
        {loading ? (
          <div className="flex justify-center items-center w-full py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEquipments.length === 0 ? (
          <div className="text-center w-full py-12 text-muted-foreground">
            Tidak ada equipment yang ditemukan
          </div>
        ) : (
          filteredEquipments.map((equipment) => (
            <EquipmentCard key={equipment.equipment_id} equipment={equipment} />
          ))
        )}
      </div>
    </main>
  );
}
