import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Tag, Users, TrendingUp, TrendingDown, AlertTriangle, Star } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createServiceRoleClient } from "@/lib/supabase/server";

type OrderRow = {
  order_id: string;
  user_id: string;
  created_at: string;
};

type OrderItemRow = {
  order_id: string;
  location_id: string;
  booking_start: string;
  booking_end: string;
};

type LocationRow = {
  shooting_location_id: string;
  shooting_location_name: string;
};

type RecentBookingRow = {
  orderId: string;
  userLabel: string;
  locationNames: string;
  dateRange: string;
};

type ReviewSummaryRow = {
  id: string;
  userName: string;
  locationTitle: string;
  location: string;
  rating: number;
  comment: string;
  date: Date;
};

const seedReviews: ReviewSummaryRow[] = [
  { id: "1", userName: "Andi Pratama", locationTitle: "Skyline Rooftop Terrace", location: "Jakarta Selatan", rating: 5, comment: "Lokasi yang luar biasa! View sunset-nya sangat memukau, perfect untuk scene romantis.", date: new Date(2026, 1, 15) },
  { id: "2", userName: "Siti Rahayu", locationTitle: "Grand Victorian Mansion", location: "Bandung", rating: 4, comment: "Interior klasiknya sangat detail dan otentik. Overall sangat recommended.", date: new Date(2026, 1, 20) },
  { id: "3", userName: "Budi Santoso", locationTitle: "Minimalist White Studio", location: "Jakarta Pusat", rating: 5, comment: "Studio clean dengan natural light yang bagus untuk produksi.", date: new Date(2026, 2, 1) },
  { id: "4", userName: "Maya Putri", locationTitle: "Tropical Garden Courtyard", location: "Bali", rating: 5, comment: "Suasana tropis autentik dan properti terawat.", date: new Date(2026, 2, 8) },
  { id: "5", userName: "Raka Wijaya", locationTitle: "Skyline Rooftop Terrace", location: "Jakarta Selatan", rating: 4, comment: "Bagus untuk night scene, meski ada sedikit noise sekitar.", date: new Date(2026, 2, 12) },
  { id: "6", userName: "Dewi Lestari", locationTitle: "Grand Victorian Mansion", location: "Bandung", rating: 5, comment: "Lokasi terawat dan staf sangat kooperatif.", date: new Date(2026, 2, 18) },
  { id: "7", userName: "Fajar Nugroho", locationTitle: "Minimalist White Studio", location: "Jakarta Pusat", rating: 2, comment: "AC kurang dingin saat sesi siang hari.", date: new Date(2026, 2, 20) },
  { id: "8", userName: "Lina Kusuma", locationTitle: "Tropical Garden Courtyard", location: "Bali", rating: 1, comment: "Saat datang, lokasi sedang renovasi sebagian.", date: new Date(2026, 2, 22) },
  { id: "9", userName: "Hendra Saputra", locationTitle: "Skyline Rooftop Terrace", location: "Jakarta Selatan", rating: 3, comment: "View oke, tapi fasilitas pendukung perlu improvement.", date: new Date(2026, 2, 25) },
  { id: "10", userName: "Rina Melati", locationTitle: "Grand Victorian Mansion", location: "Bandung", rating: 2, comment: "Parkir terbatas untuk kendaraan produksi besar.", date: new Date(2026, 3, 1) },
];

function formatReviewDate(date: Date) {
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  return `${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}`;
}

export default async function AdminPage() {
  const supabase = createServiceRoleClient();

  const [
    profilesCountResult,
    locationsCountResult,
    tagsCountResult,
    ordersCountResult,
    recentOrdersResult,
  ] = await Promise.all([
    supabase.from("profiles").select("user_id", { count: "exact", head: true }),
    supabase
      .from("shooting_locations")
      .select("shooting_location_id", { count: "exact", head: true }),
    supabase.from("tags").select("tag_id", { count: "exact", head: true }),
    supabase.from("orders").select("order_id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("order_id, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalUsers = profilesCountResult.count ?? 0;
  const totalLocations = locationsCountResult.count ?? 0;
  const totalTags = tagsCountResult.count ?? 0;
  const totalBookings = ordersCountResult.count ?? 0;

  const avgRating = (
    seedReviews.reduce((acc, review) => acc + review.rating, 0) /
    seedReviews.length
  ).toFixed(1);
  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: seedReviews.filter((review) => review.rating === star).length,
    pct:
      (seedReviews.filter((review) => review.rating === star).length /
        seedReviews.length) *
      100,
  }));
  const negativeReviews = seedReviews
    .filter((review) => review.rating <= 2)
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3);
  const sortedReviews = [...seedReviews].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  const firstHalfReviews = sortedReviews.slice(
    0,
    Math.ceil(sortedReviews.length / 2),
  );
  const secondHalfReviews = sortedReviews.slice(
    Math.ceil(sortedReviews.length / 2),
  );
  const avgFirstHalf =
    firstHalfReviews.reduce((acc, review) => acc + review.rating, 0) /
    firstHalfReviews.length;
  const avgSecondHalf =
    secondHalfReviews.reduce((acc, review) => acc + review.rating, 0) /
    secondHalfReviews.length;
  const trendUp = avgSecondHalf >= avgFirstHalf;
  const reviewLocations = [...new Set(seedReviews.map((review) => review.locationTitle))];
  const locationStats = reviewLocations.map((loc) => {
    const reviews = seedReviews.filter((review) => review.locationTitle === loc);
    const avg = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    return { loc, avg };
  });
  const droppingLocations = locationStats.filter((location) => location.avg < 3.5);

  const recentOrders = (recentOrdersResult.data ?? []) as OrderRow[];

  let recentBookings: RecentBookingRow[] = [];

  if (recentOrders.length > 0) {
    const orderIds = recentOrders.map((order) => order.order_id);

    const { data: orderItemsData } = await supabase
      .from("order_items")
      .select("order_id, location_id, booking_start, booking_end")
      .in("order_id", orderIds);

    const orderItems = (orderItemsData ?? []) as OrderItemRow[];
    const locationIds = [
      ...new Set(orderItems.map((item) => item.location_id)),
    ];

    const { data: locationsData } = await supabase
      .from("shooting_locations")
      .select("shooting_location_id, shooting_location_name")
      .in("shooting_location_id", locationIds);

    const locations = (locationsData ?? []) as LocationRow[];
    const locationMap = new Map(
      locations.map((loc) => [
        loc.shooting_location_id,
        loc.shooting_location_name,
      ]),
    );

    recentBookings = recentOrders.map((order) => {
      const itemsForOrder = orderItems.filter(
        (item) => item.order_id === order.order_id,
      );

      const locationNames = itemsForOrder
        .map(
          (item) =>
            locationMap.get(item.location_id) ?? "Lokasi tidak ditemukan",
        )
        .filter((name, index, arr) => arr.indexOf(name) === index);

      const sortedByStart = [...itemsForOrder].sort((a, b) =>
        a.booking_start.localeCompare(b.booking_start),
      );
      const firstItem = sortedByStart[0];
      const lastItem = sortedByStart[sortedByStart.length - 1];

      const dateRange =
        firstItem && lastItem
          ? formatDateRange(firstItem.booking_start, lastItem.booking_end)
          : "-";

      return {
        orderId: order.order_id,
        userLabel: order.user_id,
        locationNames:
          locationNames.length > 0 ? locationNames.join(", ") : "-",
        dateRange,
      };
    });
  }

  const stats = [
    {
      title: "Total Lokasi",
      value: String(totalLocations),
      icon: MapPin,
      description: "Lokasi aktif",
      href: "/admin/locations",
    },
    {
      title: "Total Tag",
      value: String(totalTags),
      icon: Tag,
      description: "Tag tersedia",
      href: "/admin/tags",
    },
    {
      title: "Total Booking",
      value: String(totalBookings),
      icon: TrendingUp,
      description: "Dari tabel orders",
      href: "#",
    },
    {
      title: "Total Users",
      value: String(totalUsers),
      icon: Users,
      description: "Pengguna terdaftar",
      href: "#",
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Selamat datang di admin panel DuRent
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                {stat.href !== "#" && (
                  <Link href={stat.href}>
                    <Button variant="link" className="px-0 mt-2 h-auto text-xs">
                      Lihat detail →
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Rating Rata-rata
          </p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-foreground">{avgRating}</span>
            <div className="pb-1">
              <StarRating rating={Math.round(Number(avgRating))} />
              <p className="text-[10px] text-muted-foreground mt-1">
                {seedReviews.length} total ulasan
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Distribusi Rating
          </p>
          <div className="space-y-1">
            {ratingDist.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground">{star}</span>
                <Star className="h-3 w-3 fill-primary text-primary" />
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-4 text-right text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tren Review
          </p>
          <div className="flex items-center gap-3">
            {trendUp ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {trendUp ? "Naik" : "Turun"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {avgFirstHalf.toFixed(1)} - {avgSecondHalf.toFixed(1)} avg
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Perlu Perhatian
          </p>
          {droppingLocations.length > 0 ? (
            <div className="space-y-2">
              {droppingLocations.map((location) => (
                <div key={location.loc} className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {location.loc}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Avg: {location.avg.toFixed(1)} ★
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Semua lokasi dalam kondisi baik
            </p>
          )}
        </div>
      </div>

      {negativeReviews.length > 0 && (
        <div className="glass-card p-5 space-y-3 mb-8">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <p className="text-sm font-semibold text-foreground">
              Review Negatif Terbaru
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {negativeReviews.map((review) => (
              <div key={review.id} className="rounded-xl bg-secondary/50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">
                    {review.userName}
                  </span>
                  <StarRating rating={review.rating} />
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-2">
                  {review.comment}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {review.locationTitle} - {formatReviewDate(review.date)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/locations">
              <Button variant="outline" className="w-full justify-start">
                <MapPin className="h-4 w-4 mr-2" />
                Kelola Lokasi
              </Button>
            </Link>
            <Link href="/admin/tags">
              <Button variant="outline" className="w-full justify-start">
                <Tag className="h-4 w-4 mr-2" />
                Kelola Tag
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada booking terbaru.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">User</th>
                      <th className="py-2 pr-4 font-medium">Booking Lokasi</th>
                      <th className="py-2 font-medium">Tanggal Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr
                        key={booking.orderId}
                        className="border-b border-border/40 align-top"
                      >
                        <td className="py-3 pr-4 text-xs text-muted-foreground">
                          {booking.userLabel}
                        </td>
                        <td className="py-3 pr-4 text-foreground">
                          {booking.locationNames}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {booking.dateRange}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
