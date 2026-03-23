"use client";

import { useState, useMemo } from "react";
import { Star, MapPin, ArrowLeft, MessageSquare, Filter, ArrowUpDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Review {
  id: string;
  userName: string;
  avatar: string;
  locationTitle: string;
  locationImage: string;
  location: string;
  rating: number;
  comment: string;
  date: Date;
}

const seedReviews: Review[] = [
  { id: "1", userName: "Andi Pratama", avatar: "AP", locationTitle: "Skyline Rooftop Terrace", locationImage: "https://picsum.photos/id/1018/400/300", location: "Jakarta Selatan", rating: 5, comment: "Lokasi yang luar biasa! View sunset-nya sangat memukau, perfect untuk scene romantis. Crew sangat puas dengan hasilnya.", date: new Date(2026, 1, 15) },
  { id: "2", userName: "Siti Rahayu", avatar: "SR", locationTitle: "Grand Victorian Mansion", locationImage: "https://picsum.photos/id/1040/400/300", location: "Bandung", rating: 4, comment: "Interior klasiknya sangat detail dan otentik. Sedikit sempit untuk tim besar, tapi overall sangat recommended.", date: new Date(2026, 1, 20) },
  { id: "3", userName: "Budi Santoso", avatar: "BS", locationTitle: "Minimalist White Studio", locationImage: "https://picsum.photos/id/1025/400/300", location: "Jakarta Pusat", rating: 5, comment: "Studio paling clean yang pernah saya pakai. Pencahayaan natural-nya sempurna, ga perlu banyak setup lighting tambahan.", date: new Date(2026, 2, 1) },
  { id: "4", userName: "Maya Putri", avatar: "MP", locationTitle: "Tropical Garden Courtyard", locationImage: "https://picsum.photos/id/1039/400/300", location: "Bali", rating: 5, comment: "Suasana tropis yang autentik! Tanaman-tanamannya terawat, cocok banget untuk konsep nature & wellness.", date: new Date(2026, 2, 8) },
  { id: "5", userName: "Raka Wijaya", avatar: "RW", locationTitle: "Skyline Rooftop Terrace", locationImage: "https://picsum.photos/id/1018/400/300", location: "Jakarta Selatan", rating: 4, comment: "Bagus untuk night scene. Agak berisik dari jalan raya tapi bisa di-handle dengan sound editing.", date: new Date(2026, 2, 12) },
  { id: "6", userName: "Dewi Lestari", avatar: "DL", locationTitle: "Grand Victorian Mansion", locationImage: "https://picsum.photos/id/1040/400/300", location: "Bandung", rating: 5, comment: "Properti yang sangat well-maintained. Staff-nya sangat kooperatif dan helpful selama proses shooting.", date: new Date(2026, 2, 18) },
  { id: "7", userName: "Fajar Nugroho", avatar: "FN", locationTitle: "Minimalist White Studio", locationImage: "https://picsum.photos/id/1025/400/300", location: "Jakarta Pusat", rating: 2, comment: "AC-nya kurang dingin saat shooting siang hari. Agak mengganggu kenyamanan crew.", date: new Date(2026, 2, 20) },
  { id: "8", userName: "Lina Kusuma", avatar: "LK", locationTitle: "Tropical Garden Courtyard", locationImage: "https://picsum.photos/id/1039/400/300", location: "Bali", rating: 1, comment: "Saat datang, lokasi sedang renovasi sebagian. Tidak sesuai foto. Sangat mengecewakan.", date: new Date(2026, 2, 22) },
  { id: "9", userName: "Hendra Saputra", avatar: "HS", locationTitle: "Skyline Rooftop Terrace", locationImage: "https://picsum.photos/id/1018/400/300", location: "Jakarta Selatan", rating: 3, comment: "Viewnya oke tapi fasilitas toilet kurang bersih. Perlu improvement di area pendukung.", date: new Date(2026, 2, 25) },
  { id: "10", userName: "Rina Melati", avatar: "RM", locationTitle: "Grand Victorian Mansion", locationImage: "https://picsum.photos/id/1040/400/300", location: "Bandung", rating: 2, comment: "Parkir sangat terbatas, kendaraan unit besar susah masuk. Lokasi cantik tapi aksesnya kurang.", date: new Date(2026, 3, 1) },
];

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

const locations = [...new Set(seedReviews.map((r) => r.locationTitle))];

const ReviewsPage = () => {
  const router = useRouter();
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("desc");


  // Filtered + sorted reviews
  const filteredReviews = useMemo(() => {
    let result = [...seedReviews];
    if (filterLocation !== "all") result = result.filter((r) => r.locationTitle === filterLocation);
    if (filterRating !== "all") result = result.filter((r) => r.rating === Number(filterRating));
    result.sort((a, b) => sortOrder === "desc" ? b.date.getTime() - a.date.getTime() : a.date.getTime() - b.date.getTime());
    return result;
  }, [filterLocation, filterRating, sortOrder]);

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
              {locations.map((loc) => (
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
              <SelectItem value="desc">Terbaru Dulu</SelectItem>
              <SelectItem value="asc">Terlama Dulu</SelectItem>
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
                <img
                  src={review.locationImage}
                  alt={review.locationTitle}
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
                      {format(review.date, "d MMM yyyy", { locale: id })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
                      {review.avatar}
                    </div>
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

        {filteredReviews.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Tidak ada review yang sesuai filter.</p>
          </div>
        )}
      </div>
  );
};

export default ReviewsPage;
