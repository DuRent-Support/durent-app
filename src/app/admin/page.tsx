import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Tag, Users, TrendingUp, Star } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";

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
};

type RatingDistributionRow = {
  star: number;
  count: number;
  pct: number;
};

type DashboardResponse = {
  totals?: {
    users?: number;
    locations?: number;
    tags?: number;
    bookings?: number;
  };
  bookingSummary?: {
    totalOrder?: number;
    paidOrders?: number;
    totalLocations?: number;
    totalRevenue?: number;
  };
  reviewCount?: number;
  avgRating?: string;
  ratingDist?: RatingDistributionRow[];
  recentReviews?: ReviewSummaryRow[];
  recentBookings?: RecentBookingRow[];
  message?: string;
};

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

function formatRupiah(value: number) {
  return "Rp " + value.toLocaleString("id-ID");
}

async function getAdminDashboardData(): Promise<Required<DashboardResponse>> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  const fallback: Required<DashboardResponse> = {
    totals: {
      users: 0,
      locations: 0,
      tags: 0,
      bookings: 0,
    },
    bookingSummary: {
      totalOrder: 0,
      paidOrders: 0,
      totalLocations: 0,
      totalRevenue: 0,
    },
    reviewCount: 0,
    avgRating: "0.0",
    ratingDist: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, pct: 0 })),
    recentReviews: [],
    recentBookings: [],
    message: "",
  };

  if (!host) {
    return fallback;
  }

  try {
    const response = await fetch(`${protocol}://${host}/api/admin/dashboard`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: headersList.get("cookie") ?? "",
      },
    });

    if (!response.ok) {
      return fallback;
    }

    const data = (await response.json()) as DashboardResponse;

    return {
      ...fallback,
      ...data,
      totals: {
        ...fallback.totals,
        ...data.totals,
      },
      bookingSummary: {
        ...fallback.bookingSummary,
        ...data.bookingSummary,
      },
      ratingDist: data.ratingDist ?? fallback.ratingDist,
      recentReviews: data.recentReviews ?? fallback.recentReviews,
      recentBookings: data.recentBookings ?? fallback.recentBookings,
      avgRating: data.avgRating ?? fallback.avgRating,
      reviewCount: data.reviewCount ?? fallback.reviewCount,
      message: data.message ?? "",
    };
  } catch (error) {
    console.error("Fetch admin dashboard API error:", error);
    return fallback;
  }
}

export default async function AdminPage() {
  const dashboardData = await getAdminDashboardData();
  const { totals, bookingSummary, avgRating, ratingDist, recentReviews, recentBookings, reviewCount } =
    dashboardData;

  const stats = [
    {
      title: "Total Lokasi",
      value: String(totals.locations),
      icon: MapPin,
      description: "Lokasi aktif",
      href: "/admin/locations",
    },
    {
      title: "Total Tag",
      value: String(totals.tags),
      icon: Tag,
      description: "Tag tersedia",
      href: "/admin/tags",
    },
    {
      title: "Total Booking",
      value: String(totals.bookings),
      icon: TrendingUp,
      description: "Dari tabel orders",
      href: "#",
    },
    {
      title: "Total Users",
      value: String(totals.users),
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

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Total Order</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {bookingSummary.totalOrder ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Order Lunas</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {bookingSummary.paidOrders ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">Lokasi Dibooking</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {bookingSummary.totalLocations ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-2 py-4">
          <CardContent className="px-4">
            <p className="text-xs text-muted-foreground">
              Total Nilai Transaksi
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {formatRupiah(bookingSummary.totalRevenue ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="glass-card p-5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Rating Rata-rata
          </p>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-foreground">{avgRating}</span>
            <div className="pb-1">
              <StarRating rating={Math.round(Number(avgRating))} />
              <p className="text-[10px] text-muted-foreground mt-1">
                {reviewCount} total ulasan
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
      </div>

      {recentReviews.length > 0 && (
        <div className="glass-card p-5 space-y-3 mb-8">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              Review Terbaru
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recentReviews.map((review) => (
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
                  {review.locationTitle}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
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
