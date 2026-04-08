"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  MessageSquareText,
  Star,
  TrendingUp,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReviewItem = {
  id: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  locationId: number;
  locationName: string;
  locationCity: string;
  locationImageUrl: string;
  rating: number;
  comment: string;
  createdAt: string | null;
};

type LocationOption = {
  id: number;
  name: string;
};

type LocationListItem = {
  id: number;
  name: string;
  city: string;
  imageUrl: string;
};

type ReviewsResponse = {
  reviews?: ReviewItem[];
  locationOptions?: LocationOption[];
  locations?: LocationListItem[];
  message?: string;
};

type CommentsSort = "latest" | "oldest" | "rating_desc" | "rating_asc";
type LocationSort = "avg_desc" | "avg_asc" | "count_desc" | "latest_review";

type TabKey = "comments" | "location";

function formatDate(value: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getInitials(name: string) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= value ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("comments");
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [commentsSort, setCommentsSort] = useState<CommentsSort>("latest");
  const [locationSort, setLocationSort] = useState<LocationSort>("avg_desc");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadReviews = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/admin/reviews", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as ReviewsResponse;

      if (!response.ok) {
        setErrorMessage(result.message || "Gagal memuat data review.");
        setReviews([]);
        setLocationOptions([]);
        setLocations([]);
        setIsLoading(false);
        return;
      }

      setReviews(result.reviews ?? []);
      setLocationOptions(result.locationOptions ?? []);
      setLocations(result.locations ?? []);
      setIsLoading(false);
    };

    void loadReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    if (locationFilter === "all") {
      return reviews;
    }

    const targetLocationId = Number.parseInt(locationFilter, 10);
    if (!Number.isInteger(targetLocationId) || targetLocationId <= 0) {
      return reviews;
    }

    return reviews.filter((review) => review.locationId === targetLocationId);
  }, [locationFilter, reviews]);

  const sortedComments = useMemo(() => {
    const list = [...filteredReviews];

    list.sort((a, b) => {
      if (commentsSort === "rating_desc") {
        return b.rating - a.rating;
      }

      if (commentsSort === "rating_asc") {
        return a.rating - b.rating;
      }

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      if (commentsSort === "oldest") {
        return timeA - timeB;
      }

      return timeB - timeA;
    });

    return list;
  }, [commentsSort, filteredReviews]);

  const overviewRows = useMemo(() => {
    const filteredLocations =
      locationFilter === "all"
        ? locations
        : locations.filter(
            (location) => location.id === Number.parseInt(locationFilter, 10),
          );

    const reviewAggMap = new Map<
      number,
      {
        totalRating: number;
        reviewCount: number;
        latestReviewAt: string | null;
      }
    >();

    filteredReviews.forEach((review) => {
      const existing = reviewAggMap.get(review.locationId) ?? {
        totalRating: 0,
        reviewCount: 0,
        latestReviewAt: null,
      };

      existing.totalRating += review.rating;
      existing.reviewCount += 1;

      const existingTime = existing.latestReviewAt
        ? new Date(existing.latestReviewAt).getTime()
        : 0;
      const reviewTime = review.createdAt
        ? new Date(review.createdAt).getTime()
        : 0;

      if (reviewTime > existingTime) {
        existing.latestReviewAt = review.createdAt;
      }

      reviewAggMap.set(review.locationId, existing);
    });

    const rows = filteredLocations.map((location) => {
      const agg = reviewAggMap.get(location.id);
      const reviewCount = agg?.reviewCount ?? 0;
      const totalRating = agg?.totalRating ?? 0;

      return {
        locationId: location.id,
        locationName: location.name,
        locationCity: location.city,
        locationImageUrl: location.imageUrl,
        reviewCount,
        latestReviewAt: agg?.latestReviewAt ?? null,
        avgRating:
          reviewCount > 0 ? Number((totalRating / reviewCount).toFixed(2)) : 0,
      };
    });

    rows.sort((a, b) => {
      if (locationSort === "avg_asc") {
        return a.avgRating - b.avgRating;
      }

      if (locationSort === "count_desc") {
        return b.reviewCount - a.reviewCount;
      }

      if (locationSort === "latest_review") {
        const timeA = a.latestReviewAt
          ? new Date(a.latestReviewAt).getTime()
          : 0;
        const timeB = b.latestReviewAt
          ? new Date(b.latestReviewAt).getTime()
          : 0;
        return timeB - timeA;
      }

      return b.avgRating - a.avgRating;
    });

    return rows;
  }, [filteredReviews, locationFilter, locationSort, locations]);

  const averageRating = useMemo(() => {
    if (filteredReviews.length === 0) {
      return 0;
    }

    const total = filteredReviews.reduce(
      (sum, review) => sum + review.rating,
      0,
    );
    return Number((total / filteredReviews.length).toFixed(2));
  }, [filteredReviews]);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
            Reviews
          </h1>
          <p className="text-sm text-muted-foreground">
            Analisis komentar lokasi dan ringkasan rating per lokasi.
          </p>
        </div>
        <Badge variant="outline">{filteredReviews.length} review</Badge>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total Review</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {filteredReviews.length}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Rata-rata Rating</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {averageRating}
            </p>
            <div className="mt-2">
              <Stars value={Math.round(averageRating)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">
              Total Lokasi Direview
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {overviewRows.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex w-full rounded-lg border border-border p-1 md:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("comments")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:flex-none ${
                activeTab === "comments"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <MessageSquareText className="h-4 w-4" />
              Show by Comments
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("location")}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors md:flex-none ${
                activeTab === "location"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Show by Location
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Filter lokasi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua lokasi</SelectItem>
                {locationOptions.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeTab === "comments" ? (
              <Select
                value={commentsSort}
                onValueChange={(value) =>
                  setCommentsSort(value as CommentsSort)
                }
              >
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Sort comments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Terbaru</SelectItem>
                  <SelectItem value="oldest">Terlama</SelectItem>
                  <SelectItem value="rating_desc">Rating tertinggi</SelectItem>
                  <SelectItem value="rating_asc">Rating terendah</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={locationSort}
                onValueChange={(value) =>
                  setLocationSort(value as LocationSort)
                }
              >
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Sort lokasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="avg_desc">Avg rating tertinggi</SelectItem>
                  <SelectItem value="avg_asc">Avg rating terendah</SelectItem>
                  <SelectItem value="count_desc">Ulasan terbanyak</SelectItem>
                  <SelectItem value="latest_review">Review terbaru</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Memuat data reviews...
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="border-destructive/50">
          <CardContent className="py-10 text-center text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : activeTab === "comments" ? (
        sortedComments.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada review pada filter ini.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {sortedComments.map((review) => (
              <Card key={review.id} className="overflow-hidden">
                <div className="relative h-28 w-full bg-muted/30">
                  <Image
                    src={review.locationImageUrl || "/hero.webp"}
                    alt={review.locationName}
                    fill
                    sizes="(max-width: 1280px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <CardContent className="space-y-2.5 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold leading-tight text-foreground">
                        {review.locationName}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {review.locationCity}
                      </p>
                    </div>
                    <Badge variant="outline" className="h-5 px-2 text-[10px]">
                      {review.rating}/5
                    </Badge>
                  </div>

                  <Stars value={review.rating} />

                  <p className="line-clamp-2 text-xs leading-relaxed text-foreground">
                    {review.comment.length > 0
                      ? review.comment
                      : "(Tanpa komentar)"}
                  </p>

                  <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage
                          src={review.avatarUrl ?? ""}
                          alt={review.userName}
                        />
                        <AvatarFallback>
                          {getInitials(review.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[11px] font-medium text-foreground">
                          {review.userName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {review.userId.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <CalendarDays className="h-3 w-3" />
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : overviewRows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada data lokasi pada filter ini.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {overviewRows.map((row) => (
            <Card key={row.locationId} className="overflow-hidden">
              <div className="relative h-36 w-full bg-muted/30">
                <Image
                  src={row.locationImageUrl || "/hero.webp"}
                  alt={row.locationName}
                  fill
                  sizes="(max-width: 1280px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{row.locationName}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {row.locationCity}
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Average Rating</span>
                  <span className="font-semibold text-foreground">
                    {row.avgRating}
                  </span>
                </div>
                <Stars value={Math.round(row.avgRating)} />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Total Ulasan</span>
                  <span className="font-semibold text-foreground">
                    {row.reviewCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Review Terbaru</span>
                  <span className="font-semibold text-foreground">
                    {formatDate(row.latestReviewAt)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
