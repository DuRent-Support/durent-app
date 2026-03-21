"use client";

import {
  Users,
  Check,
  MapPin,
  Maximize,
  ShoppingBag,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCart } from "@/hooks/use-cart";
import { LocationCardProps } from "@/types/location-card";

import formatPrice from "@/lib/formatPrice";

export default function LocationCard({
  id,
  name,
  city,
  price,
  description,
  area,
  imageUrl,
  pax,
  rate,
  tags,
}: LocationCardProps) {
  const { addItem, isInCart } = useCart();
  const isAdded = isInCart(id);
  const images = imageUrl && imageUrl.length > 0 ? imageUrl : ["/hero.webp"];

  return (
    <Dialog>
      <div className="group snap-start shrink-0 w-[440px] sm:w-[420px]">
        <DialogTrigger asChild>
          <button type="button" className="w-full text-left">
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <img
                src={images[0]}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              {/* Rating badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-1 rounded-lg text-sm font-semibold">
                <Star className="h-3.5 w-3.5 fill-star text-star" />
                {rate.toFixed(1)}
              </div>
              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
                  {tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="bg-background/80 backdrop-blur-sm text-foreground text-xs font-medium px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="pt-3 pb-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-foreground leading-tight">
                  {name}
                </h3>
                <span className="text-primary font-bold whitespace-nowrap">
                  {formatPrice(price)}
                  <span className="text-muted-foreground font-normal text-sm">
                    /hari
                  </span>
                </span>
              </div>
              <p className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {city}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Maximize className="h-3.5 w-3.5" />
                  {area} m²
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {pax}
                </span>
              </div>
            </div>
          </button>
        </DialogTrigger>

        <Button
          type="button"
          className="mt-4 w-full"
          variant={isAdded ? "secondary" : "default"}
          onClick={() =>
            addItem({
              id,
              name,
              city,
              price,
              imageUrl: images[0],
              tags,
            })
          }
        >
          {isAdded ? (
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

      <DialogContent className="w-[88vw] sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="grid gap-0 grid-cols-1">
          <div className="relative bg-muted/20">
            <Carousel className="w-full">
              <CarouselContent className="ml-0">
                {images.map((img, index) => (
                  <CarouselItem key={`${id}-${index}`} className="pl-0">
                    <img
                      src={img}
                      alt={`${name} ${index + 1}`}
                      className="w-full h-[260px] sm:h-[360px] md:h-[460px] object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {images.length > 1 ? (
                <>
                  <CarouselPrevious className="left-4 top-1/2 -translate-y-1/2" />
                  <CarouselNext className="right-4 top-1/2 -translate-y-1/2" />
                </>
              ) : null}
            </Carousel>
          </div>

          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 pt-1">
                <MapPin className="h-4 w-4" />
                {city}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                <span className="text-muted-foreground">Harga</span>
                <span className="text-base font-semibold text-primary">
                  {formatPrice(price)}
                  <span className="text-muted-foreground font-normal text-sm ml-1">
                    /hari
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Luas</p>
                  <p className="mt-1 font-medium">{area} m²</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Kapasitas</p>
                  <p className="mt-1 font-medium">{pax} pax</p>
                </div>
              </div>

              <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="mt-1 flex items-center gap-1 font-medium">
                  <Star className="h-4 w-4 fill-star text-star" />
                  {rate.toFixed(1)}
                </p>
              </div>

              {description ? (
                <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Deskripsi</p>
                  <p className="mt-2 leading-relaxed text-foreground/90">
                    {description}
                  </p>
                </div>
              ) : null}

              {tags && tags.length > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <Button
              type="button"
              className="mt-6 w-full"
              variant={isAdded ? "secondary" : "default"}
              onClick={() =>
                addItem({
                  id,
                  name,
                  city,
                  price,
                  imageUrl: images[0],
                  tags,
                })
              }
            >
              {isAdded ? (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
