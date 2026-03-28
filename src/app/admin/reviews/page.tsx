"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, MapPin, ArrowLeft, MessageSquare, Filter, ArrowUpDown, User } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  userId: string;
  locationId: string;
  userName: string;
  avatarUrl: string | null;
  locationTitle: string;
  locationImage: string;
  location: string;
  rating: number;
  comment: string;
}

type ReviewsResponse = {
  reviews?: Review[];
  locationOptions?: string[];
  message?: string;
};

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`${size === "md" ? "h-5 w-5" : "h-3.5 w-3.5"} ${s <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
      />
    ))}
  </div>
);

const ReviewsPage = () => {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("high");
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  useEffect(() => {
    const loadReviews = async () => {
      setLoading(true);

      const response = await fetch("/api/admin/reviews", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const result = (await response.json()) as ReviewsResponse;
        console.error("Fetch reviews error:", result.message);
        setReviews([]);
        setLocationOptions([]);
        setLoading(false);
        return;
      }

      const result = (await response.json()) as ReviewsResponse;
      setReviews(result.reviews ?? []);
      setLocationOptions(result.locationOptions ?? []);
      setLoading(false);
    };

    void loadReviews();
  }, []);

  // Filtered + sorted reviews
  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    if (filterLocation !== "all") result = result.filter((r) => r.locationTitle === filterLocation);
    if (filterRating !== "all") result = result.filter((r) => r.rating === Number(filterRating));
    result.sort((a, b) => sortOrder === "high" ? b.rating - a.rating : a.rating - b.rating);
    return result;
  }, [filterLocation, filterRating, sortOrder, reviews]);

  return (
      <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/admin")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-bold text-foreground">Reviews</h1>
        </div>


        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter:</span>
          </div>
          <Select value={filterLocation} onValueChange={setFilterLocation}>
            <SelectTrigger className="w-[200px] h-9 text-xs bg-secondary border-border">
              <SelectValue placeholder="Semua Lokasi" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Lokasi</SelectItem>
              {locationOptions.map((loc) => (
                <SelectItem key={loc} value={loc}>{loc}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-secondary border-border">
              <SelectValue placeholder="Semua Rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Rating</SelectItem>
              {[5, 4, 3, 2, 1].map((s) => (
                <SelectItem key={s} value={String(s)}>{s} Bintang</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-[160px] h-9 text-xs bg-secondary border-border">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">Rating Tertinggi</SelectItem>
              <SelectItem value="low">Rating Terendah</SelectItem>
            </SelectContent>
          </Select>
          {(filterLocation !== "all" || filterRating !== "all") && (
            <Badge variant="secondary" className="text-xs cursor-pointer hover:bg-accent" onClick={() => { setFilterLocation("all"); setFilterRating("all"); }}>
              Reset Filter ✕
            </Badge>
          )}
          <span className="text-xs text-muted-foreground ml-auto">{filteredReviews.length} review ditemukan</span>
        </div>

        {/* Review Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map((review) => (
            <div key={review.id} className="glass-card overflow-hidden group">
              <div className="flex gap-4 p-4">
                <Image
                  src={review.locationImage}
                  alt={review.locationTitle}
                  width={96}
                  height={96}
                  className="h-24 w-24 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{review.locationTitle}</h3>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <MapPin className="h-3 w-3" />
                        <span>{review.location}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                      user: {review.userId.slice(0, 8)}...
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.avatarUrl ? (
                      <Image
                        src={review.avatarUrl}
                        alt={review.userName}
                        width={24}
                        height={24}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary">
                        <User className="h-3.5 w-3.5" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-foreground">{review.userName}</span>
                    <StarRating rating={review.rating} />
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    <MessageSquare className="inline h-3 w-3 mr-1 -mt-0.5" />
                    {review.comment}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">Memuat data review...</p>
          </div>
        ) : filteredReviews.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">belom ada review</p>
          </div>
        )}
      </div>
  );
};

export default ReviewsPage;
