"use client";

import Image from "next/image";
import { Check, Camera, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import formatPrice from "@/lib/formatPrice";
import type { Equipment } from "@/types";

type EquipmentCardProps = {
  equipment: Equipment;
};

function specsPreview(specs: Equipment["specs"]) {
  if (Array.isArray(specs)) {
    return `${specs.length} spec items`;
  }

  const entries = Object.entries((specs ?? {}) as Record<string, unknown>);
  if (entries.length === 0) return "No specs";

  return entries
    .slice(0, 2)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" • ");
}

export default function EquipmentCard({ equipment }: EquipmentCardProps) {
  const router = useRouter();
  const { addItem, isInCart } = useCart();

  const images =
    equipment.images.length > 0 ? equipment.images : ["/hero.webp"];
  const added = isInCart(equipment.equipment_id, "equipment");

  const handleAdd = () => {
    addItem({
      id: equipment.equipment_id,
      itemType: "equipment",
      name: equipment.name,
      subtitle: "Equipment",
      price: equipment.price,
      imageUrl: images[0],
      tags: [],
      requiresDateRange: true,
    });

    // router.push("/cart");
  };

  return (
    <article className="group snap-start shrink-0 w-[clamp(260px,84vw,420px)] sm:w-[380px]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        <Image
          src={images[0]}
          alt={equipment.name}
          fill
          sizes="(max-width: 640px) 84vw, (max-width: 1024px) 380px, 420px"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      <div className="pb-1 pt-2.5 sm:pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground sm:text-base">
            {equipment.name}
          </h3>
          <span className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
            {formatPrice(equipment.price)}
          </span>
        </div>

        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
          {equipment.description}
        </p>

        <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
          <Camera className="h-3.5 w-3.5" />
          {specsPreview(equipment.specs)}
        </p>
      </div>

      <Button
        type="button"
        className="mt-3 w-full sm:mt-4"
        variant={added ? "secondary" : "default"}
        onClick={handleAdd}
      >
        {added ? (
          <>
            <Check className="h-4 w-4" />
            Sudah di keranjang
          </>
        ) : (
          <>
            <ShoppingBag className="h-4 w-4" />
            Tambah ke checkout
          </>
        )}
      </Button>
    </article>
  );
}
