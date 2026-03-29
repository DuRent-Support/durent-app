"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

function formatLocationRating(rate: number | null) {
  if (rate === null || !Number.isFinite(rate)) {
    return "belum ada review";
  }

  return rate.toFixed(1);
}

type LocationReview = {
  id: string;
  userLabel: string;
  avatarUrl: string | null;
  rating: number;
  comment: string;
  createdAt: string | null;
};

type LocationReviewsResponse = {
  reviews?: LocationReview[];
  message?: string;
};

function formatReviewDate(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

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
  redirectToCartOnAdd = false,
}: LocationCardProps) {
  const router = useRouter();
  const { addItem, isInCart } = useCart();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reviews, setReviews] = useState<LocationReview[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const isAdded = isInCart(id, "location");
  const images = imageUrl && imageUrl.length > 0 ? imageUrl : ["/hero.webp"];
  const hasReview = rate !== null && Number.isFinite(rate);
  const ratingLabel = formatLocationRating(rate);

  const handleAddToCart = () => {
    addItem({
      id,
      itemType: "location",
      name,
      subtitle: city,
      price,
      imageUrl: images[0],
      tags,
      requiresDateRange: true,
    });

    if (redirectToCartOnAdd) {
      router.push("/cart");
    }
  };

  useEffect(() => {
    if (!isDialogOpen) {
      return;
    }

    let isMounted = true;

    const loadReviews = async () => {
      setIsLoadingReviews(true);
      setReviewsError(null);

      try {
        const response = await fetch(`/api/locations/${id}/reviews`, {
          method: "GET",
          cache: "no-store",
        });

        const result = (await response.json()) as LocationReviewsResponse;

        if (!isMounted) {
          return;
        }

        if (!response.ok) {
          setReviews([]);
          setReviewsError(result.message || "Gagal mengambil review lokasi.");
          return;
        }

        setReviews(result.reviews ?? []);
      } catch {
        if (!isMounted) {
          return;
        }

        setReviews([]);
        setReviewsError("Terjadi kesalahan saat mengambil review lokasi.");
      } finally {
        if (isMounted) {
          setIsLoadingReviews(false);
        }
      }
    };

    void loadReviews();

    return () => {
      isMounted = false;
    };
  }, [id, isDialogOpen]);

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <div className="group snap-start shrink-0 w-[clamp(260px,84vw,440px)] sm:w-[420px]">
        <DialogTrigger asChild>
          <button type="button" className="w-full text-left">
            {/* Image */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src={images[0]}
                alt={name}
                fill
                sizes="(max-width: 640px) 84vw, (max-width: 1024px) 420px, 440px"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Rating badge */}
              <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-background/90 px-2 py-1 text-xs font-semibold backdrop-blur-sm sm:right-3 sm:top-3 sm:text-sm">
                {hasReview ? <Star className="h-3.5 w-3.5 fill-star text-star" /> : null}
                <span>{ratingLabel}</span>
              </div>
              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-1.5 sm:bottom-3 sm:left-3">
                  {tags.slice(0, 3).map((tag, index) => (
                    <span
                      key={index}
                      className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur-sm sm:text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="pb-1 pt-2.5 sm:pt-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="line-clamp-2 text-sm font-bold leading-tight text-foreground sm:text-base">
                  {name}
                </h3>
                <span className="whitespace-nowrap text-sm font-bold text-primary sm:text-base">
                  {formatPrice(price)}
                  <span className="text-xs font-normal text-muted-foreground sm:text-sm">
                    /hari
                  </span>
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                <MapPin className="h-3.5 w-3.5" />
                {city}
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground sm:gap-4 sm:text-sm">
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
          className="mt-3 w-full sm:mt-4"
          variant={isAdded ? "secondary" : "default"}
          onClick={handleAddToCart}
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

      <DialogContent className="h-[94vh] w-[98vw] max-w-[2400px] overflow-hidden p-0">
        <div className="grid h-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
          <section className="flex min-h-0 flex-col border-b border-border/40 lg:border-r lg:border-b-0">
            <div className="relative bg-muted/20">
              <Carousel className="w-full">
                <CarouselContent className="ml-0">
                  {images.map((img, index) => (
                    <CarouselItem key={`${id}-${index}`} className="pl-0">
                      <div className="relative h-[230px] w-full sm:h-[280px] lg:h-[320px]">
                        <Image
                          src={img}
                          alt={`${name} ${index + 1}`}
                          fill
                          sizes="(max-width: 1024px) 96vw, 62vw"
                          className="h-full w-full object-cover"
                        />
                      </div>
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

            <div className="min-h-0 flex-1 overflow-hidden p-5 lg:p-6">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{name}</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 pt-1">
                  <MapPin className="h-4 w-4" />
                  {city}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                  <span className="text-muted-foreground">Harga</span>
                  <span className="text-base font-semibold text-primary">
                    {formatPrice(price)}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/hari</span>
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
                  {hasReview ? (
                    <p className="mt-1 flex items-center gap-1 font-medium">
                      <Star className="h-4 w-4 fill-star text-star" />
                      {ratingLabel}
                    </p>
                  ) : (
                    <p className="mt-1 font-medium text-muted-foreground">{ratingLabel}</p>
                  )}
                </div>

                {description ? (
                  <div className="rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Deskripsi</p>
                    <p className="mt-2 line-clamp-6 leading-relaxed text-foreground/90">
                      {description}
                    </p>
                  </div>
                ) : null}

                {tags && tags.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Tags</p>
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
                className="mt-5 w-full"
                variant={isAdded ? "secondary" : "default"}
                onClick={handleAddToCart}
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
          </section>

          <aside className="flex min-h-0 flex-col bg-muted/10">
            <div className="border-b border-border/40 px-4 py-4">
              <h3 className="text-base font-semibold text-foreground">Review Tempat</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Total {reviews.length} review untuk lokasi ini
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {isLoadingReviews ? (
                <div className="space-y-3">
                  <div className="h-20 animate-pulse rounded-xl border border-border/40 bg-background/60" />
                  <div className="h-20 animate-pulse rounded-xl border border-border/40 bg-background/60" />
                  <div className="h-20 animate-pulse rounded-xl border border-border/40 bg-background/60" />
                </div>
              ) : reviewsError ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-4 text-sm text-destructive">
                  {reviewsError}
                </div>
              ) : reviews.length === 0 ? (
                <div className="rounded-xl border border-border/40 bg-background/70 px-3 py-4 text-sm text-muted-foreground">
                  Belum ada review untuk lokasi ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <article
                      key={review.id}
                      className="rounded-xl border border-border/40 bg-background/80 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-muted">
                            {review.avatarUrl ? (
                              <Image
                                src={review.avatarUrl}
                                alt={review.userLabel}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                                {review.userLabel.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {review.userLabel}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {formatReviewDate(review.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">
                          <Star className="h-3.5 w-3.5 fill-star text-star" />
                          {review.rating.toFixed(1)}
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                        {review.comment}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
