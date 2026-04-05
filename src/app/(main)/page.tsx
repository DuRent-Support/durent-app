"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Camera,
  CreditCard,
  Loader2,
  MapPin,
  ShoppingBag,
  Star,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardBooking = {
  id: string;
  orderId: string;
  locationName: string;
  city: string;
  imageUrl: string;
  bookingFrom: string;
  bookingTo: string;
  days: number;
  subtotal: number;
  state: "upcoming" | "ongoing" | "finished";
  paymentStatus: string;
};

type DashboardPendingPayment = {
  orderId: string;
  totalPrice: number;
  createdAt: string | null;
  expiresAt: string | null;
};

type DashboardResponse = {
  summary?: {
    totalBookings?: number;
    upcomingBookings?: number;
    ongoingBookings?: number;
    finishedBookings?: number;
    pendingPayments?: number;
    toReviewCount?: number;
    totalSpent?: number;
  };
  nextBookings?: DashboardBooking[];
  pendingPayments?: DashboardPendingPayment[];
  message?: string;
};

type DashboardState = {
  summary: {
    totalBookings: number;
    upcomingBookings: number;
    ongoingBookings: number;
    finishedBookings: number;
    pendingPayments: number;
    toReviewCount: number;
    totalSpent: number;
  };
  nextBookings: DashboardBooking[];
  pendingPayments: DashboardPendingPayment[];
};

function formatPrice(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  const startLabel = startDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const endLabel = endDate.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return `${startLabel} - ${endLabel}`;
}

function getStateLabel(state: DashboardBooking["state"]) {
  if (state === "ongoing") {
    return "Berlangsung";
  }

  if (state === "upcoming") {
    return "Akan Datang";
  }

  return "Selesai";
}

const DEFAULT_DASHBOARD: DashboardState = {
  summary: {
    totalBookings: 0,
    upcomingBookings: 0,
    ongoingBookings: 0,
    finishedBookings: 0,
    pendingPayments: 0,
    toReviewCount: 0,
    totalSpent: 0,
  },
  nextBookings: [],
  pendingPayments: [],
};

export default function HomePage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardState>(DEFAULT_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/dashboard/user", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as DashboardResponse;

      if (!response.ok) {
        setErrorMessage(result.message || "Gagal memuat dashboard user.");
        setLoading(false);
        return;
      }

      setDashboard({
        summary: {
          ...DEFAULT_DASHBOARD.summary,
          ...(result.summary ?? {}),
        },
        nextBookings: result.nextBookings ?? [],
        pendingPayments: result.pendingPayments ?? [],
      });
      setLoading(false);
    };

    void loadDashboard();
  }, [router]);

  const quickLinks = [
    {
      title: "Cari Lokasi",
      description: "Temukan lokasi untuk kebutuhan shooting Anda",
      href: "/locations",
      icon: MapPin,
    },
    {
      title: "Pilih Crew",
      description: "Tambah kru profesional sesuai kebutuhan produksi",
      href: "/crews",
      icon: Users,
    },
    {
      title: "Sewa Equipment",
      description: "Lengkapi produksi dengan peralatan terbaik",
      href: "/equipment",
      icon: Camera,
    },
  ];

  const stats = [
    {
      title: "Total Booking",
      value: dashboard.summary.totalBookings,
      icon: CalendarCheck,
    },
    {
      title: "Akan Datang",
      value: dashboard.summary.upcomingBookings,
      icon: MapPin,
    },
    {
      title: "Berlangsung",
      value: dashboard.summary.ongoingBookings,
      icon: ShoppingBag,
    },
    {
      title: "Perlu Review",
      value: dashboard.summary.toReviewCount,
      icon: Star,
    },
    {
      title: "Pending Payment",
      value: dashboard.summary.pendingPayments,
      icon: CreditCard,
    },
    {
      title: "Total Belanja",
      value: formatPrice(dashboard.summary.totalSpent),
      icon: CreditCard,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="fixed left-0 right-0 top-0 -z-10 h-[340px]">
        <Image
          src="/hero.webp"
          alt="Background"
          className="h-full w-full object-cover"
          fill
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      </div>

      <div className="relative z-10 rounded-3xl border border-border/40 bg-card/60 p-6 shadow-sm backdrop-blur-sm md:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          User Dashboard
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold text-foreground md:text-4xl">
          Ringkasan aktivitas booking Anda
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Pantau booking yang berlangsung, pembayaran pending, dan lanjutkan proses reservasi dengan cepat.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/locations">Mulai booking lokasi</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/reservations">Lihat semua reservasi</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/payments">Lanjutkan pembayaran</Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="mt-8 flex min-h-[280px] items-center justify-center rounded-3xl border border-border/40 bg-card/40">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : errorMessage ? (
        <Card className="mt-8 border-destructive/30 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Gagal memuat dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Button onClick={() => window.location.reload()}>Coba lagi</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="border-border/40 bg-card/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{stat.title}</span>
                      <Icon className="h-4 w-4" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </section>

          <section className="mt-8 grid gap-6 xl:grid-cols-2">
            <Card className="border-border/40 bg-card/60">
              <CardHeader>
                <CardTitle>Booking Terdekat</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.nextBookings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Belum ada booking aktif atau upcoming.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.nextBookings.map((booking) => (
                      <article
                        key={booking.id}
                        className="flex gap-3 rounded-xl border border-border/40 bg-background/40 p-3"
                      >
                        <Image
                          src={booking.imageUrl}
                          alt={booking.locationName}
                          width={64}
                          height={64}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {booking.locationName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{booking.city}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateRange(booking.bookingFrom, booking.bookingTo)}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-secondary-foreground">
                              {getStateLabel(booking.state)}
                            </span>
                            <span className="text-xs font-semibold text-primary">
                              {formatPrice(booking.subtotal)}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href="/reservations">Buka halaman reservasi</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/60">
              <CardHeader>
                <CardTitle>Pembayaran Pending</CardTitle>
              </CardHeader>
              <CardContent>
                {dashboard.pendingPayments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Tidak ada pembayaran yang menunggu.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dashboard.pendingPayments.map((payment) => (
                      <div
                        key={payment.orderId}
                        className="rounded-xl border border-border/40 bg-background/40 p-3"
                      >
                        <p className="text-sm font-semibold text-foreground">
                          Order {payment.orderId}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Total: {formatPrice(payment.totalPrice)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Expired: {payment.expiresAt ? new Date(payment.expiresAt).toLocaleString("id-ID") : "-"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <Button asChild className="mt-4 w-full">
                  <Link href="/payments">Lanjutkan pembayaran</Link>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {quickLinks.map((linkItem) => {
              const Icon = linkItem.icon;

              return (
                <Card key={linkItem.href} className="border-border/40 bg-card/60">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-5 w-5 text-primary" />
                      {linkItem.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{linkItem.description}</p>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={linkItem.href}>Buka</Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
