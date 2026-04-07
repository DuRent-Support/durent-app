"use client";

import Image from "next/image";
import { MapPin, Maximize, Star, Users } from "lucide-react";

import formatPrice from "@/lib/formatPrice";
import { AppCardType, type AppCardProps } from "@/types/app-card";

const fallbackImage = "/hero.webp";

function formatRating(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "belum ada review";
  return value.toFixed(1);
}

export default function AppCard(props: AppCardProps) {
  const imageSrc = props.imageUrl || fallbackImage;
  const isLocation = props.type === AppCardType.Location;
  const isCrew = props.type === AppCardType.Crew;
  const isFnb = props.type === AppCardType.Fnb;

  const tags = isLocation
    ? props.tags
    : isCrew
      ? props.skills
      : isFnb
        ? props.fnbTags
        : [];

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
        {tags.length > 0 ? (
          <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1.5 sm:bottom-3 sm:left-3">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm sm:text-xs"
              >
                {tag}
              </span>
            ))}
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

      {props.action ? (
        <div className="mt-auto pt-3 sm:pt-4">{props.action}</div>
      ) : null}
    </div>
  );
}
