import { headers } from "next/headers";
import Link from "next/link";
import { Calendar, ReceiptText, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import formatPrice from "@/lib/formatPrice";

type DashboardSummary = {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  paidLocationBookings: number;
  reviewedLocations: number;
  pendingPayments: number;
  totalSpent: number;
};

type RecentOrder = {
  orderId: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string | null;
  locationItemCount: number;
};

type PendingPayment = {
  orderId: string;
  totalPrice: number;
  createdAt: string | null;
  expiresAt: string | null;
};

type DashboardResponse = {
  summary?: Partial<DashboardSummary>;
  recentOrders?: RecentOrder[];
  pendingPayments?: PendingPayment[];
  message?: string;
};

const emptySummary: DashboardSummary = {
  totalOrders: 0,
  paidOrders: 0,
  pendingOrders: 0,
  paidLocationBookings: 0,
  reviewedLocations: 0,
  pendingPayments: 0,
  totalSpent: 0,
};

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID");
}

function getPaymentBadgeVariant(paymentStatus: string) {
  const normalized = String(paymentStatus).trim().toLowerCase();
  if (normalized === "paid" || normalized === "settlement") return "secondary";
  if (normalized === "pending") return "outline";
  return "ghost";
}

async function getDashboardData(): Promise<{
  summary: DashboardSummary;
  recentOrders: RecentOrder[];
  pendingPayments: PendingPayment[];
  message: string;
}> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return {
      summary: emptySummary,
      recentOrders: [],
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
        recentOrders: [],
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
      recentOrders: data.recentOrders ?? [],
      pendingPayments: data.pendingPayments ?? [],
      message: data.message ?? "",
    };
  } catch (error) {
    console.error("Fetch user dashboard error:", error);
    return {
      summary: emptySummary,
      recentOrders: [],
      pendingPayments: [],
      message: "",
    };
  }
}

export default async function UserDashboardPage() {
  const { summary, recentOrders, pendingPayments } = await getDashboardData();

  const stats = [
    {
      title: "Total Orders",
      value: summary.totalOrders,
      helper: "Semua order kamu",
    },
    {
      title: "Orders Lunas",
      value: summary.paidOrders,
      helper: "Status paid/settlement",
    },
    {
      title: "Orders Pending",
      value: summary.pendingOrders,
      helper: "Menunggu pembayaran",
    },
    {
      title: "Location Booking",
      value: summary.paidLocationBookings,
      helper: "Booking lokasi yang sudah lunas",
    },
    {
      title: "Location Direview",
      value: summary.reviewedLocations,
      helper: "Jumlah lokasi yang sudah diulas",
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
              Orders Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada order.</p>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="rounded-xl border border-border/60 bg-background p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Order #{order.orderId}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <Badge
                      variant={getPaymentBadgeVariant(order.paymentStatus)}
                    >
                      {order.paymentStatus}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ReceiptText className="h-3.5 w-3.5" />
                      {order.locationItemCount} item lokasi
                    </span>
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3.5 w-3.5" />
                      {formatPrice(order.totalAmount)}
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
            <span>Orders lunas</span>
            <span className="font-semibold text-foreground">
              {summary.paidOrders}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Lokasi direview</span>
            <span className="font-semibold text-foreground">
              {summary.reviewedLocations}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
