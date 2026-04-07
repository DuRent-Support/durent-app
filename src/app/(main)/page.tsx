import { headers } from "next/headers";
import Link from "next/link";
import { Calendar, Clock, MapPin, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import formatPrice from "@/lib/formatPrice";

type BookingState = "upcoming" | "ongoing" | "finished";

type DashboardSummary = {
  totalBookings: number;
  upcomingBookings: number;
  ongoingBookings: number;
  finishedBookings: number;
  pendingPayments: number;
  toReviewCount: number;
  totalSpent: number;
};

type NextBooking = {
  id: string;
  orderId: string;
  locationId: string;
  locationName: string;
  city: string;
  imageUrl: string;
  bookingFrom: string;
  bookingTo: string;
  days: number;
  subtotal: number;
  state: BookingState;
  paymentStatus: string;
};

type PendingPayment = {
  orderId: string;
  totalPrice: number;
  createdAt: string | null;
  expiresAt: string | null;
};

type DashboardResponse = {
  summary?: Partial<DashboardSummary>;
  nextBookings?: NextBooking[];
  pendingPayments?: PendingPayment[];
  message?: string;
};

const emptySummary: DashboardSummary = {
  totalBookings: 0,
  upcomingBookings: 0,
  ongoingBookings: 0,
  finishedBookings: 0,
  pendingPayments: 0,
  toReviewCount: 0,
  totalSpent: 0,
};

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  return `${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID");
}

function getBookingLabel(state: BookingState) {
  if (state === "ongoing") return "Sedang Berjalan";
  if (state === "finished") return "Selesai";
  return "Akan Datang";
}

function getBookingBadgeVariant(state: BookingState) {
  if (state === "ongoing") return "secondary";
  if (state === "finished") return "ghost";
  return "outline";
}

async function getDashboardData(): Promise<{
  summary: DashboardSummary;
  nextBookings: NextBooking[];
  pendingPayments: PendingPayment[];
  message: string;
}> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return {
      summary: emptySummary,
      nextBookings: [],
      pendingPayments: [],
      message: "",
    };
  }

  try {
    const response = await fetch(`${protocol}://${host}/api/dashboard/user`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: headersList.get("cookie") ?? "",
      },
    });

    if (!response.ok) {
      return {
        summary: emptySummary,
        nextBookings: [],
        pendingPayments: [],
        message: "",
      };
    }

    const data = (await response.json()) as DashboardResponse;

    return {
      summary: {
        ...emptySummary,
        ...data.summary,
      },
      nextBookings: data.nextBookings ?? [],
      pendingPayments: data.pendingPayments ?? [],
      message: data.message ?? "",
    };
  } catch (error) {
    console.error("Fetch user dashboard error:", error);
    return {
      summary: emptySummary,
      nextBookings: [],
      pendingPayments: [],
      message: "",
    };
  }
}

export default async function UserDashboardPage() {
  const { summary, nextBookings, pendingPayments } = await getDashboardData();

  const stats = [
    {
      title: "Total Booking",
      value: summary.totalBookings,
      helper: "Semua pesanan kamu",
    },
    {
      title: "Akan Datang",
      value: summary.upcomingBookings,
      helper: "Booking mendatang",
    },
    {
      title: "Sedang Berjalan",
      value: summary.ongoingBookings,
      helper: "Booking aktif",
    },
    {
      title: "Selesai",
      value: summary.finishedBookings,
      helper: "Booking selesai",
    },
    {
      title: "Pembayaran Pending",
      value: summary.pendingPayments,
      helper: "Menunggu pembayaran",
    },
    {
      title: "Perlu Review",
      value: summary.toReviewCount,
      helper: "Berikan ulasan",
    },
  ];

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">
          Dashboard Kamu
        </h1>
        <p className="text-muted-foreground">
          Ringkasan booking, pembayaran, dan aktivitas syuting kamu.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border">
            <CardContent className="pt-6">
              <p className="text-xs text-muted-foreground">{stat.title}</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.helper}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card className="border-border md:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Booking Selanjutnya
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada booking aktif.
              </p>
            ) : (
              nextBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="rounded-xl border border-border/60 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {booking.locationName}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{booking.city}</span>
                      </div>
                    </div>
                    <Badge variant={getBookingBadgeVariant(booking.state)}>
                      {getBookingLabel(booking.state)}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateRange(booking.bookingFrom, booking.bookingTo)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {booking.days} hari
                    </span>
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      {formatPrice(booking.subtotal)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-base">
              Pembayaran Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada pembayaran tertunda.
              </p>
            ) : (
              pendingPayments.map((payment) => (
                <div
                  key={payment.orderId}
                  className="rounded-xl border border-border/60 bg-background p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      Order #{payment.orderId}
                    </p>
                    <Badge variant="destructive">Pending</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total: {formatPrice(payment.totalPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dibuat: {formatDate(payment.createdAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Kadaluarsa: {formatDate(payment.expiresAt)}
                  </p>
                  <Link href="/payments">
                    <Button size="sm" className="mt-2 w-full">
                      Lanjutkan Pembayaran
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-display text-base">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Total dibelanjakan</span>
            <span className="font-semibold text-foreground">
              {formatPrice(summary.totalSpent)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Booking selesai</span>
            <span className="font-semibold text-foreground">
              {summary.finishedBookings}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Review tersisa</span>
            <span className="font-semibold text-foreground">
              {summary.toReviewCount}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
