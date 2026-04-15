"use client";

import Image from "next/image";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Package2,
  ReceiptText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

type ReservationItem = {
  id: string;
  orderDbId: number;
  orderCode: string;
  itemType: string;
  itemTypeLabel: string;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  bookingStart: string | null;
  bookingEnd: string | null;
  isFromBundle: boolean;
  bundleId: number | null;
  bundleName: string | null;
  imageUrl: string | null;
};

type ReservationOrder = {
  id: number;
  orderCode: string;
  purpose: string;
  paymentStatus: string;
  createdAt: string | null;
  totalAmount: number;
  itemCount: number;
  items: ReservationItem[];
};

type ReservationsResponse = {
  reservations?: ReservationOrder[];
  message?: string;
};

function formatPrice(value: number) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID")}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function getPaymentStatusBadgeClass(status: string) {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();

  if (normalized === "paid" || normalized === "settlement") {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }

  if (normalized === "pending") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  if (
    normalized === "deny" ||
    normalized === "cancel" ||
    normalized === "expire"
  ) {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }

  return "bg-secondary text-secondary-foreground";
}

export default function ReservationsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ReservationOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadReservations = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/reservations", {
        method: "GET",
        cache: "no-store",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as ReservationsResponse;

      if (!response.ok) {
        setErrorMessage(result.message || "Gagal memuat riwayat reservasi.");
        setOrders([]);
        setIsLoading(false);
        return;
      }

      setOrders(result.reservations ?? []);
      setIsLoading(false);
    };

    void loadReservations();
  }, [router]);

  const totalItems = useMemo(
    () => orders.reduce((sum, order) => sum + order.itemCount, 0),
    [orders],
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/")}
            aria-label="Kembali"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Reservations
            </h1>
            <p className="text-sm text-muted-foreground">
              Riwayat semua order Anda dari orders dan order_items.
            </p>
          </div>
        </div>

        <Badge variant="outline">{orders.length} order</Badge>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Memuat riwayat reservasi...
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <Card className="border-destructive/50">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada order sebelumnya.
            </p>
            <Button className="mt-4" onClick={() => router.push("/explore")}>
              Mulai Booking
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ReceiptText className="h-4 w-4" />
                Total order:{" "}
                <span className="font-semibold text-foreground">
                  {orders.length}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package2 className="h-4 w-4" />
                Total item:{" "}
                <span className="font-semibold text-foreground">
                  {totalItems}
                </span>
              </div>
            </CardContent>
          </Card>

          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base md:text-lg">
                    Order {order.orderCode}
                  </CardTitle>
                  <Badge
                    className={getPaymentStatusBadgeClass(order.paymentStatus)}
                  >
                    {order.paymentStatus}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Tujuan: {order.purpose}</Badge>
                  <Badge variant="outline">
                    Tanggal order: {formatDate(order.createdAt)}
                  </Badge>
                  <Badge variant="outline">{order.itemCount} item</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex w-full items-center justify-between"
                    >
                      <span>Lihat detail item ({order.items.length})</span>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-3 pt-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border/60 p-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-md border border-border/60 bg-muted/30">
                              <Image
                                src={
                                  item.imageUrl || "/placeholder_durent.webp"
                                }
                                alt={item.itemName}
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">
                                {item.itemName}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="secondary">
                                  {item.itemTypeLabel}
                                </Badge>

                                <span>Qty: {item.quantity}</span>
                                {item.isFromBundle ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    Dari bundle: {item.bundleName ?? "Bundle"}
                                  </Badge>
                                ) : null}
                              </div>
                              {item.bookingStart || item.bookingEnd ? (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  <span>
                                    {formatDate(item.bookingStart)} -{" "}
                                    {formatDate(item.bookingEnd)}
                                  </span>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">
                              {formatPrice(item.unitPrice)} x {item.quantity}
                            </p>
                            <p className="font-semibold text-primary">
                              {formatPrice(item.lineTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Separator />

                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total Order</span>
                  <span>{formatPrice(order.totalAmount)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
