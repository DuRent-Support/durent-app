"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ChevronDown, Clock3, RefreshCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { createClient } from "@/lib/supabase/client";

type SnapResult = {
  order_id?: string;
  transaction_status?: string;
  payment_type?: string;
};

type Snap = {
  pay: (
    token: string,
    options?: {
      onSuccess?: (result: SnapResult) => void;
      onPending?: (result: SnapResult) => void;
      onError?: (result: SnapResult) => void;
      onClose?: () => void;
    },
  ) => void;
};

type PendingPaymentRow = {
  order_id: string;
  total_price: string | number | null;
  payment_status: string | null;
  created_at: string | null;
  midtrans_token: string | null;
  midtrans_expire_at: string | null;
  items: PendingPaymentItem[];
};

type PendingPaymentItem = {
  order_id: string;
  location_id: string;
  booking_start: string;
  booking_end: string;
  quantity: number | null;
  price: string | number | null;
  location_name: string;
};

type OrderItemRow = {
  order_id: string;
  location_id: string;
  booking_start: string;
  booking_end: string;
  quantity: number | null;
  price: string | number | null;
};

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const numericValue = value.replace(/[^0-9]/g, "");
    return Number.parseInt(numericValue, 10) || 0;
  }

  return 0;
}

type LocationRow = {
  shooting_location_id: string;
  shooting_location_name: string;
};

function formatRupiah(value: string | number | null) {
  const numberValue =
    typeof value === "number"
      ? value
      : Number.parseInt(String(value ?? "").replace(/[^0-9]/g, ""), 10) || 0;

  return `Rp ${numberValue.toLocaleString("id-ID")}`;
}

function formatExpiryLabel(msLeft: number) {
  if (msLeft <= 0) {
    return "Kadaluarsa";
  }

  const totalSeconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatDateOnly(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function ensureSnapLoaded(snapUrl: string, clientKey: string) {
  const win = window as Window & { snap?: Snap };

  if (win.snap) {
    return win.snap;
  }

  return new Promise<Snap>((resolve, reject) => {
    const existingScript = document.getElementById(
      "midtrans-snap",
    ) as HTMLScriptElement | null;
    const script = existingScript ?? document.createElement("script");

    if (!existingScript) {
      script.id = "midtrans-snap";
      script.src = snapUrl;
      script.async = true;
      script.setAttribute("data-client-key", clientKey);
      document.body.appendChild(script);
    }

    const checkSnap = () => {
      if (win.snap) {
        resolve(win.snap);
        return;
      }

      window.setTimeout(checkSnap, 100);
    };

    script.addEventListener("load", checkSnap, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Gagal memuat Snap.js dari Midtrans.")),
      { once: true },
    );

    window.setTimeout(() => {
      if (win.snap) {
        resolve(win.snap);
      }
    }, 0);
  });
}

export default function PaymentsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pendingPayments, setPendingPayments] = useState<PendingPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(0);

  const snapUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const fetchPendingPayments = useCallback(async () => {
    setRefreshing(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error("Auth error:", userError);
      setPendingPayments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        "order_id, total_price, payment_status, created_at, midtrans_token, midtrans_expire_at",
      )
      .eq("user_id", user.id)
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch pending payments error:", error);
      setPendingPayments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const baseRows = (data ?? []) as Omit<PendingPaymentRow, "items">[];
    const pendingRows = baseRows.filter((row) => Boolean(row.midtrans_token));

    if (pendingRows.length === 0) {
      setPendingPayments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const orderIds = pendingRows.map((row) => row.order_id);
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select("order_id, location_id, booking_start, booking_end, quantity, price")
      .in("order_id", orderIds);

    if (orderItemsError) {
      console.error("Fetch order items error:", orderItemsError);
      setPendingPayments(pendingRows.map((row) => ({ ...row, items: [] })));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const orderItems = (orderItemsData ?? []) as OrderItemRow[];
    const locationIds = [...new Set(orderItems.map((item) => item.location_id))];

    let locationMap = new Map<string, string>();

    if (locationIds.length > 0) {
      const { data: locationsData, error: locationsError } = await supabase
        .from("shooting_locations")
        .select("shooting_location_id, shooting_location_name")
        .in("shooting_location_id", locationIds);

      if (locationsError) {
        console.error("Fetch locations error:", locationsError);
      } else {
        const locations = (locationsData ?? []) as LocationRow[];
        locationMap = new Map(
          locations.map((location) => [
            location.shooting_location_id,
            location.shooting_location_name,
          ]),
        );
      }
    }

    const enrichedRows = pendingRows.map((row) => ({
      ...row,
      items: orderItems
        .filter((item) => item.order_id === row.order_id)
        .map((item) => ({
          ...item,
          location_name:
            locationMap.get(item.location_id) ?? "Lokasi tidak ditemukan",
        })),
    }));

    setPendingPayments(enrichedRows);
    setLoading(false);
    setRefreshing(false);
  }, [router, supabase]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPendingPayments();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fetchPendingPayments]);

  const continuePayment = async (row: PendingPaymentRow) => {
    if (!midtransClientKey || !row.midtrans_token) {
      return;
    }

    setActiveOrderId(row.order_id);

    try {
      const snap = await ensureSnapLoaded(snapUrl, midtransClientKey);

      snap.pay(row.midtrans_token, {
        onSuccess: (result) => {
          console.log("Midtrans success:", result);
          setActiveOrderId(null);
          void fetchPendingPayments();
          router.refresh();
        },
        onPending: (result) => {
          console.log("Midtrans pending:", result);
          setActiveOrderId(null);
          void fetchPendingPayments();
        },
        onError: (result) => {
          console.error("Midtrans error:", result);
          setActiveOrderId(null);
        },
        onClose: () => {
          setActiveOrderId(null);
        },
      });
    } catch (error) {
      console.error("Gagal membuka Midtrans Snap:", error);
      setActiveOrderId(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background/70 text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Payments
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Lanjutkan pembayaran yang masih pending.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => void fetchPendingPayments()}
          disabled={refreshing}
        >
          <RefreshCcw className="h-4 w-4" />
          {refreshing ? "Memuat..." : "Refresh"}
        </Button>
      </div>

      {loading ? (
        <Card className="border-border/50">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Memuat data pembayaran...
          </CardContent>
        </Card>
      ) : pendingPayments.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              Tidak ada pembayaran pending.
            </p>
            <Button asChild className="mt-4">
              <Link href="/">Kembali jelajahi lokasi</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingPayments.map((row) => {
            const expiresAt = row.midtrans_expire_at
              ? new Date(row.midtrans_expire_at)
              : null;
            const msLeft = expiresAt ? expiresAt.getTime() - nowTs : 0;
            const isExpired = msLeft <= 0;

            return (
              <Card key={row.order_id} className="border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-base">Order {row.order_id}</CardTitle>
                    <Badge variant={isExpired ? "destructive" : "secondary"}>
                      {isExpired ? "Expired" : "Pending"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Pembayaran</p>
                      <p className="font-semibold text-foreground">
                        {formatRupiah(row.total_price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-muted-foreground">Waktu Tersisa</p>
                      <p className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Clock3 className="h-4 w-4" />
                        {formatExpiryLabel(msLeft)}
                      </p>
                    </div>
                  </div>

                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex w-full items-center justify-between"
                      >
                        <span>Order items ({row.items?.length || 0})</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      {row.items.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Tidak ada item detail untuk order ini.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {row.items.map((item, index) => (
                            <div
                              key={`${item.order_id}-${item.location_id}-${index}`}
                              className="rounded-xl border border-border/50 bg-muted/20 p-3"
                            >
                              <p className="text-sm font-medium text-foreground">
                                {item.location_name}
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDateOnly(item.booking_start)} - {formatDateOnly(item.booking_end)}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Durasi: {item.quantity ?? 1} hari
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                Harga/hari: {formatRupiah(item.price)}
                              </p>
                              <p className="mt-1 text-xs font-medium text-foreground">
                                Subtotal: {formatRupiah(parseNumber(item.price) * (item.quantity ?? 1))}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>

                  <Button
                    type="button"
                    className="w-full"
                    disabled={isExpired || activeOrderId === row.order_id}
                    onClick={() => void continuePayment(row)}
                  >
                    {activeOrderId === row.order_id
                      ? "Membuka pembayaran..."
                      : isExpired
                        ? "Pembayaran kadaluarsa"
                        : "Lanjutkan pembayaran"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
