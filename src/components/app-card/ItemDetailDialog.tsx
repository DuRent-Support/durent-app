"use client";

import Image from "next/image";
import {
  ChevronRight,
  MapPin,
  Maximize,
  Package,
  Star,
  Users,
} from "lucide-react";

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
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import formatPrice from "@/lib/formatPrice";
import { AppCardType } from "@/types/app-card";
import {
  useItemDetail,
  type BundleDetail,
  type LocationDetail,
  type RentalDetail,
} from "@/hooks/use-item-detail";

const fallbackImage = "/placeholder_durent.webp";

function DetailImages({
  images,
}: {
  images: { url: string; position: number }[];
}) {
  const sorted = [...images]
    .sort((a, b) => a.position - b.position)
    .filter((i) => i.url && i.url.trim() !== "");
  const srcs = sorted.length > 0 ? sorted.map((i) => i.url) : [fallbackImage];

  if (srcs.length === 1) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl">
        <Image src={srcs[0]} alt="" fill className="object-cover" />
      </div>
    );
  }

  return (
    <Carousel className="w-full">
      <CarouselContent>
        {srcs.map((src, i) => (
          <CarouselItem key={i}>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl">
              <Image src={src} alt="" fill className="object-cover" />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-2" />
      <CarouselNext className="right-2" />
    </Carousel>
  );
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${
            i < Math.round(value)
              ? "fill-yellow-400 text-yellow-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
      <span className="ml-0.5 text-xs font-medium">{value.toFixed(1)}</span>
    </div>
  );
}

function LocationSection({ data }: { data: LocationDetail }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
          <span className="text-xs text-muted-foreground">Kota</span>
          <span className="flex items-center gap-1 text-sm font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {data.city}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
          <span className="text-xs text-muted-foreground">Luas Area</span>
          <span className="flex items-center gap-1 text-sm font-medium">
            <Maximize className="h-3.5 w-3.5 text-primary" />
            {data.area} m²
          </span>
        </div>
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted p-3">
          <span className="text-xs text-muted-foreground">Kapasitas</span>
          <span className="flex items-center gap-1 text-sm font-medium">
            <Users className="h-3.5 w-3.5 text-primary" />
            {data.pax} orang
          </span>
        </div>
        <div className="col-span-2 flex flex-col gap-0.5 rounded-lg bg-muted p-3 sm:col-span-3">
          <span className="text-xs text-muted-foreground">Harga</span>
          <span className="text-sm font-bold text-primary">
            {formatPrice(data.price)}
          </span>
        </div>
      </div>

      {data.reviews.length > 0 && (
        <>
          <Separator />
          <div>
            <h4 className="mb-3 text-sm font-semibold">Ulasan</h4>
            <div className="flex flex-col gap-3">
              {data.reviews.map((review, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {review.profiles?.full_name ?? "Pengguna"}
                    </span>
                    <StarRating value={review.rating} />
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function RentalSection({ data }: { data: RentalDetail }) {
  const specs = data.specifications;
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-muted p-3">
        <span className="text-xs text-muted-foreground">Harga</span>
        <p className="text-sm font-bold text-primary">
          {formatPrice(data.price)}
        </p>
      </div>
      {specs.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Spesifikasi</h4>
          <div className="flex flex-col gap-1.5">
            {specs.map((spec, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="text-muted-foreground">
                  {typeof spec === "object"
                    ? Object.entries(spec)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")
                    : String(spec)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BundleSection({ data }: { data: BundleDetail }) {
  const allItems = [
    ...data.bundle_rentals.map((i) => ({ ...i, category: "Rental" })),
    ...data.bundle_crews.map((i) => ({ ...i, category: "Kru" })),
    ...data.bundle_food_and_beverage.map((i) => ({ ...i, category: "F&B" })),
    ...data.bundle_expendables.map((i) => ({ ...i, category: "Habis Pakai" })),
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-muted p-3">
          <span className="text-xs text-muted-foreground">Harga Normal</span>
          <p className="text-sm font-medium text-muted-foreground line-through">
            {formatPrice(data.base_price)}
          </p>
        </div>
        <div className="rounded-lg bg-primary/10 p-3">
          <span className="text-xs text-muted-foreground">Harga Bundle</span>
          <p className="text-sm font-bold text-primary">
            {formatPrice(data.final_price)}
          </p>
        </div>
      </div>

      {allItems.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Package className="h-4 w-4" />
            Isi Paket
          </h4>
          <div className="flex flex-col gap-2">
            {allItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    {item.category}
                  </span>
                  <span className="font-medium">{item.item.name}</span>
                </div>
                <span className="text-muted-foreground">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SimplePriceSection({ price }: { price: number }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <span className="text-xs text-muted-foreground">Harga</span>
      <p className="text-sm font-bold text-primary">{formatPrice(price)}</p>
    </div>
  );
}

function DialogSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
        <Skeleton className="h-16 rounded-lg" />
      </div>
    </div>
  );
}

type ItemDetailDialogProps = {
  id: number;
  type: AppCardType;
  isOpen: boolean;
  onClose: () => void;
};

export function ItemDetailDialog({
  id,
  type,
  isOpen,
  onClose,
}: ItemDetailDialogProps) {
  const { data, isLoading, error } = useItemDetail(id, type, isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0">
        <div className="flex-1 overflow-y-auto p-6">
          {(isLoading || error) && (
            <DialogHeader className="sr-only">
              <DialogTitle>Detail</DialogTitle>
            </DialogHeader>
          )}

          {isLoading && <DialogSkeleton />}

          {error && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {error}
            </div>
          )}

          {!isLoading && !error && data && (
            <div className="flex flex-col gap-4">
              <DetailImages images={data.images} />

              <DialogHeader>
                <DialogTitle>{data.name}</DialogTitle>
                <DialogDescription>{data.description}</DialogDescription>
              </DialogHeader>

              <Separator />

              {data.type === AppCardType.Location && (
                <LocationSection data={data} />
              )}
              {data.type === AppCardType.Rental && (
                <RentalSection data={data} />
              )}
              {data.type === AppCardType.Crew && (
                <SimplePriceSection price={data.price} />
              )}
              {data.type === AppCardType.Fnb && (
                <SimplePriceSection price={data.price} />
              )}
              {data.type === AppCardType.Expendable && (
                <SimplePriceSection price={data.price} />
              )}
              {data.type === AppCardType.Bundle && (
                <BundleSection data={data} />
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
