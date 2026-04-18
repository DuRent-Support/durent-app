"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, MapPin, Maximize, ShoppingCart, Star, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

import formatPrice from "@/lib/formatPrice";
import { AppCardType, type AppCardProps } from "@/types/app-card";

const fallbackImage = "/placeholder_durent.webp";

function formatRating(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "belum ada review";
  return value.toFixed(1);
}

export default function AppCard(props: AppCardProps) {
  const { addItem, isInCart } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const imageSrc = props.imageUrl || fallbackImage;
  const isLocation = props.type === AppCardType.Location;

  const inCart = props.cartItem
    ? isInCart(props.cartItem.id, props.cartItem.itemType)
    : false;

  const handleCartClick = () => {
    if (!props.cartItem || justAdded) return;
    addItem(props.cartItem);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  const priceLabel =
    props.type === AppCardType.Bundle
      ? formatPrice(props.finalPrice)
      : formatPrice(props.price);

  return (
    <div
      className="group w-full flex h-full flex-col"
      onClick={props.onClick}
      role={props.onClick ? "button" : undefined}
      tabIndex={props.onClick ? 0 : undefined}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
        <Image
          src={imageSrc}
          alt={props.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {isLocation ? (
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm sm:right-3 sm:top-3 sm:text-sm">
            {Number.isFinite(props.rating) && Number(props.rating) > 0 ? (
              <Star className="h-3.5 w-3.5 fill-star text-star" />
            ) : null}
            <span>{formatRating(props.rating)}</span>
          </div>
        ) : null}
      </div>

      <div className="flex-1 pb-1 pt-2.5 sm:pt-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground sm:text-base">
            {props.name}
          </h3>
          {props.type === AppCardType.Bundle ? (
            <div className="text-right">
              <span className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
                {priceLabel}
              </span>
              <span className="block text-[11px] text-muted-foreground line-through">
                {formatPrice(props.basePrice)}
              </span>
            </div>
          ) : (
            <span className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
              {priceLabel}
            </span>
          )}
        </div>

        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
          {props.description}
        </p>

        {isLocation ? (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {props.city}
            </span>
            <span className="flex items-center gap-1">
              <Maximize className="h-3.5 w-3.5" />
              {props.area} m2
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {props.pax}
            </span>
          </div>
        ) : null}
      </div>

      {props.cartItem ? (
        <div className="mt-auto pt-3 sm:pt-4">
          <Button
            type="button"
            disabled={justAdded}
            className={`w-full gap-2 font-semibold transition-colors ${
              inCart
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-green-500 text-white hover:bg-green-600"
            }`}
            onClick={handleCartClick}
          >
            {justAdded ? (
              <Check className="h-4 w-4" />
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                {inCart ? "Sudah di keranjang" : "Tambah ke keranjang"}
              </>
            )}
          </Button>
        </div>
      ) : props.action ? (
        <div className="mt-auto pt-3 sm:pt-4">{props.action}</div>
      ) : null}
    </div>
  );
}
