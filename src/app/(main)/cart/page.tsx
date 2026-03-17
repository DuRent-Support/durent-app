"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, CalendarIcon, ShoppingBag, Trash2 } from "lucide-react";
import Script from "next/script";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCart } from "@/hooks/use-cart";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { type CartDateRange } from "@/types/cart";

function parsePrice(price: string | number | null | undefined) {
  const numericValue = String(price ?? "").replace(/[^0-9]/g, "");
  return Number.parseInt(numericValue, 10) || 0;
}

function formatPrice(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatRange(range: CartDateRange | null) {
  if (!range?.from || !range?.to) {
    return "Pilih tanggal sewa";
  }

  const from = format(range.from, "d MMM yyyy", { locale: id });
  const to = format(range.to, "d MMM yyyy", { locale: id });

  return from === to ? from : `${from} - ${to}`;
}

function hasSelectedDateRange(range: CartDateRange | null) {
  return Boolean(range?.from && range?.to);
}

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

type TokenizerResponse = {
  token?: string;
  message?: string;
};

function normalizeToStartOfDay(value: Date | string | null | undefined) {
  const parsed = value ? new Date(value) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export default function CartPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [isSnapReady, setIsSnapReady] = useState(false);
  const { items, removeItem, updateDateRange, clearCart, totalItems, getDays } =
    useCart();
  const hasUnselectedDateRange = items.some(
    (item) => !hasSelectedDateRange(item.dateRange),
  );
  const todayTimestamp = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime();
  }, []);

  const snapUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  const handleCheckout = async () => {
    if (hasUnselectedDateRange) {
      console.error(
        "Tanggal sewa wajib diisi untuk semua item sebelum checkout.",
      );
      return;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Auth check failed:", error.message);
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    const checkoutUser = {
      id: user.id,
      email: user.email,
    };

    const purchasedItems = items.map((item) => {
      const days = getDays(item);
      const unitPrice = parsePrice(item.price);

      return {
        id: item.id,
        name: item.name,
        city: item.city,
        dateRange: item.dateRange,
        days,
        unitPrice,
        subtotal: unitPrice * days,
      };
    });

    console.log("Checkout user:", checkoutUser);
    console.log("Checkout items:", purchasedItems);

    const response = await fetch("/api/midtrans/tokenizer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user: checkoutUser,
        items: purchasedItems,
      }),
    });

    const tokenizerResult = (await response.json()) as TokenizerResponse;

    if (!response.ok) {
      console.error("Tokenizer request failed:", tokenizerResult);
      return;
    }

    if (!tokenizerResult.token) {
      console.error("Token Midtrans tidak tersedia:", tokenizerResult);
      return;
    }

    const snap = (window as Window & { snap?: Snap }).snap;

    if (!snap) {
      console.error("Snap.js belum siap. Coba lagi beberapa detik.");
      return;
    }

    snap.pay(tokenizerResult.token, {
      onSuccess: (result) => {
        console.log("Midtrans success:", result);
      },
      onPending: (result) => {
        console.log("Midtrans pending:", result);
      },
      onError: (result) => {
        console.error("Midtrans error:", result);
      },
      onClose: () => {
        console.log(
          "User menutup popup Midtrans sebelum menyelesaikan pembayaran",
        );
      },
    });
  };

  const subtotal = items.reduce((sum, item) => {
    return sum + parsePrice(item.price) * getDays(item);
  }, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8">
      <Script
        src={snapUrl}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
        onLoad={() => setIsSnapReady(true)}
      />
      <div className="flex flex-col gap-6 rounded-3xl border border-border/40 bg-card/50 p-6 shadow-sm backdrop-blur-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background/70 text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              Keranjang
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Atur durasi sewa dan lanjutkan ke pemesanan.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 rounded-2xl border border-border/40 bg-background/70 px-4 py-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Total item</p>
              <p className="text-xl font-semibold text-foreground">
                {totalItems}
              </p>
            </div>
          </div>
          {items.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground"
              onClick={clearCart}
            >
              Hapus semua
            </Button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/50 bg-card/30 px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Keranjang masih kosong
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Tambahkan lokasi dari halaman utama dulu, lalu atur rentang
            tanggalnya di sini.
          </p>
          <Button asChild className="mt-6">
            <Link href="/">Jelajahi lokasi</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {items.map((item) => {
              const days = getDays(item);
              const itemSubtotal = parsePrice(item.price) * days;

              return (
                <article
                  key={item.id}
                  className="rounded-3xl border border-border/40 bg-card/40 p-4 shadow-sm backdrop-blur-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-44 w-full rounded-2xl object-cover sm:h-36 sm:w-28"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold text-foreground">
                            {item.name}
                          </h2>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.city}
                          </p>
                          {item.tags.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.tags.slice(0, 3).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-auto w-full justify-start rounded-2xl border-border/50 px-4 py-3 text-left"
                            >
                              <CalendarIcon className="mr-3 h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  Tanggal sewa
                                </p>
                                <p
                                  className={cn(
                                    "truncate text-sm font-medium",
                                    hasSelectedDateRange(item.dateRange)
                                      ? "text-foreground"
                                      : "text-muted-foreground",
                                  )}
                                >
                                  {formatRange(item.dateRange)}
                                </p>
                              </div>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="range"
                              selected={item.dateRange ?? undefined}
                              onSelect={(range) => {
                                if (!range?.from) {
                                  return;
                                }

                                updateDateRange(item.id, {
                                  from: range.from,
                                  to: range.to ?? range.from,
                                });
                              }}
                              disabled={(date) => {
                                const normalizedDate =
                                  normalizeToStartOfDay(date);

                                if (!normalizedDate) {
                                  return true;
                                }

                                const target = normalizedDate.getTime();

                                if (target < todayTimestamp) {
                                  return true;
                                }

                                return false;
                              }}
                              numberOfMonths={1}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                        <div className="rounded-2xl border border-border/40 bg-background/70 px-4 py-3 lg:min-w-44">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Subtotal
                          </p>
                          <p className="mt-1 text-base font-semibold text-primary">
                            {formatPrice(itemSubtotal)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {days > 0
                              ? `${days} hari x ${item.price}`
                              : "Pilih tanggal dulu"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="h-fit rounded-3xl border border-border/40 bg-card/60 p-6 shadow-sm backdrop-blur-sm xl:sticky xl:top-8">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Ringkasan pesanan
            </h2>
            <div className="mt-5 space-y-4">
              {items.map((item) => {
                const days = getDays(item);

                return (
                  <div key={item.id} className="text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {days > 0
                            ? `${days} hari x ${item.price}`
                            : "Pilih tanggal dulu"}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-foreground">
                        {formatPrice(parsePrice(item.price) * days)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="my-5 border-t border-border/40" />

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total item</span>
              <span>{totalItems}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-lg font-semibold text-foreground">
              <span>Total</span>
              <span className="text-primary">{formatPrice(subtotal)}</span>
            </div>

            <Button
              className="mt-6 w-full"
              size="lg"
              onClick={handleCheckout}
              disabled={!isSnapReady || hasUnselectedDateRange}
            >
              Checkout
            </Button>
            {hasUnselectedDateRange ? (
              <p className="mt-2 text-xs text-destructive">
                Pilih tanggal sewa untuk semua item sebelum checkout.
              </p>
            ) : null}
            <Button
              asChild
              variant="secondary"
              className="mt-3 w-full"
              size="lg"
            >
              <a
                href="https://wa.me/628111029064"
                target="_blank"
                rel="noopener noreferrer"
              >
                Pesan via WhatsApp
              </a>
            </Button>
          </aside>
        </div>
      )}
    </div>
  );
}
