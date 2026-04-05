"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, TicketPercent, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import formatPrice from "@/lib/formatPrice";
import {
  buildWhatsappLink,
  buildWhatsappMessage,
} from "@/lib/whatsappMessageHelper";

type GroupedItems = {
  locations: CheckoutItem[];
  expendables: CheckoutItem[];
  bundles: CheckoutItem[];
  others: CheckoutItem[];
};

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

type MidtransTokenizerResponse = {
  token?: string;
  message?: string;
};

type CheckoutItem = {
  id: string;
  sourceId: string;
  imageUrl: string;
  name: string;
  subtitle: string;
  itemType: string;
  tags: string[];
  dateRange: { from: Date; to: Date } | null;
  requiresDateRange: boolean;
  multiplier: number;
  unitPrice: number;
  lineTotal: number;
};

const REFERRAL_DISCOUNT_RULES: Record<
  string,
  { type: "percent" | "fixed"; value: number }
> = {
  DURENT10: { type: "percent", value: 10 },
  HEMAT50: { type: "fixed", value: 50000 },
};

function toNumberPrice(raw: string) {
  const normalized = String(raw)
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDateLabel(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
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

export default function CartPage() {
  const router = useRouter();
  const { items, totalItems, clearCart, getDays, updateDateRange } = useCart();
  const [referralInput, setReferralInput] = useState("");
  const [appliedReferral, setAppliedReferral] = useState("");
  const [referralError, setReferralError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const checkoutItems = useMemo<CheckoutItem[]>(() => {
    return items.map((item) => {
      const multiplier = Math.max(1, Number(getDays(item) || 1));
      const unitPrice = toNumberPrice(item.price);

      return {
        id: item.id,
        sourceId: item.sourceId,
        imageUrl: item.imageUrl,
        name: item.name,
        subtitle: item.subtitle,
        itemType: String(item.itemType),
        tags: item.tags,
        dateRange: item.dateRange,
        requiresDateRange: item.requiresDateRange,
        multiplier,
        unitPrice,
        lineTotal: unitPrice * multiplier,
      };
    });
  }, [items, getDays]);

  const grouped = useMemo<GroupedItems>(() => {
    const locations: CheckoutItem[] = [];
    const expendables: CheckoutItem[] = [];
    const bundles: CheckoutItem[] = [];
    const others: CheckoutItem[] = [];

    checkoutItems.forEach((item) => {
      const itemType = item.itemType.toLowerCase();
      const subtitle = item.subtitle.toLowerCase();

      if (itemType === "location") {
        locations.push(item);
        return;
      }

      if (itemType === "expendable" || subtitle.includes("expendable")) {
        expendables.push(item);
        return;
      }

      if (itemType === "bundle" || subtitle.includes("bundle")) {
        bundles.push(item);
        return;
      }

      others.push(item);
    });

    return {
      locations,
      expendables,
      bundles,
      others,
    };
  }, [checkoutItems]);

  const subtotal = useMemo(
    () => checkoutItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [checkoutItems],
  );

  const discount = useMemo(() => {
    const normalized = appliedReferral.trim().toUpperCase();
    const rule = REFERRAL_DISCOUNT_RULES[normalized];
    if (!rule) return 0;

    if (rule.type === "percent") {
      return Math.floor((subtotal * rule.value) / 100);
    }

    return Math.min(subtotal, rule.value);
  }, [appliedReferral, subtotal]);

  const totalPrice = Math.max(0, subtotal - discount);
  const snapUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
  const midtransClientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;

  const whatsappLink = useMemo(() => {
    const message = buildWhatsappMessage(items);
    return buildWhatsappLink("628111029064", message);
  }, [items]);

  const applyReferral = () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) {
      setAppliedReferral("");
      setReferralError("");
      return;
    }

    if (!REFERRAL_DISCOUNT_RULES[code]) {
      setAppliedReferral("");
      setReferralError("Kode referral tidak valid.");
      return;
    }

    setAppliedReferral(code);
    setReferralError("");
  };

  const handleMidtransCheckout = async () => {
    if (checkoutItems.length === 0 || isPaying) {
      return;
    }

    if (!midtransClientKey) {
      setCheckoutError("Midtrans client key belum dikonfigurasi.");
      return;
    }

    const hasMissingDates = checkoutItems.some(
      (item) =>
        item.requiresDateRange &&
        (!item.dateRange?.from || !item.dateRange?.to),
    );

    if (hasMissingDates) {
      setCheckoutError("Masih ada item tanpa tanggal booking.");
      return;
    }

    setCheckoutError("");
    setIsPaying(true);

    try {
      const checkoutPayloadItems = checkoutItems.map((item) => ({
        id: item.sourceId,
        name: item.name,
        subtotal: item.lineTotal,
        unitPrice: item.unitPrice,
        days: item.multiplier,
        dateRange: item.dateRange
          ? {
              from: item.dateRange.from.toISOString(),
              to: item.dateRange.to.toISOString(),
            }
          : undefined,
      }));

      console.log("Checkout items (client):", checkoutPayloadItems);

      const response = await fetch("/api/midtrans/tokenizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: checkoutPayloadItems,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as MidtransTokenizerResponse;

      if (!response.ok || !result.token) {
        setCheckoutError(result.message || "Gagal membuat token Midtrans.");
        return;
      }

      const snap = await ensureSnapLoaded(snapUrl, midtransClientKey);

      snap.pay(result.token, {
        onSuccess: () => {
          clearCart();
          router.push("/payments");
          router.refresh();
        },
        onPending: () => {
          clearCart();
          router.push("/payments");
          router.refresh();
        },
        onError: () => {
          setCheckoutError("Pembayaran gagal diproses oleh Midtrans.");
        },
        onClose: () => {
          setIsPaying(false);
        },
      });
    } catch (error) {
      console.error("Checkout Midtrans error:", error);
      setCheckoutError("Terjadi kesalahan saat memproses checkout Midtrans.");
    } finally {
      setIsPaying(false);
    }
  };

  const handleSelectStartDate = (item: CheckoutItem, selectedDate?: Date) => {
    if (!selectedDate) {
      return;
    }

    const currentEnd = item.dateRange?.to ?? selectedDate;
    const nextEnd = currentEnd < selectedDate ? selectedDate : currentEnd;

    updateDateRange(item.id, {
      from: selectedDate,
      to: nextEnd,
    });
  };

  const handleSelectEndDate = (item: CheckoutItem, selectedDate?: Date) => {
    if (!selectedDate) {
      return;
    }

    const currentStart = item.dateRange?.from ?? selectedDate;
    const nextStart = currentStart > selectedDate ? selectedDate : currentStart;

    updateDateRange(item.id, {
      from: nextStart,
      to: selectedDate,
    });
  };

  const renderGroup = (title: string, sectionItems: CheckoutItem[]) => (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge variant="secondary">{sectionItems.length} item</Badge>
      </div>

      <div className="space-y-3">
        {sectionItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-border/60 bg-background p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-md border border-border/60">
                  <Image
                    src={item.imageUrl || "/hero.webp"}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 40vw, 160px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Start: {formatDateLabel(item.dateRange?.from)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    End: {formatDateLabel(item.dateRange?.to)}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 px-2 text-xs"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          Pilih Start
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={item.dateRange?.from ?? undefined}
                          onSelect={(date) => handleSelectStartDate(item, date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1.5 px-2 text-xs"
                        >
                          <CalendarDays className="h-3.5 w-3.5" />
                          Pilih End
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={item.dateRange?.to ?? undefined}
                          onSelect={(date) => handleSelectEndDate(item, date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <p className="text-sm font-semibold text-primary">
                {formatPrice(item.lineTotal)}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatPrice(item.unitPrice)} x {item.multiplier}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <main className="px-4 py-8 md:px-6 md:py-10">
      <section className="mx-auto w-full max-w-7xl">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Checkout
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              Periksa kembali semua item sebelum melanjutkan ke pembayaran.
            </p>
            <Badge variant="outline">Total item checkout: {totalItems}</Badge>
          </div>

          <Button
            type="button"
            variant="destructive"
            className="gap-2"
            onClick={clearCart}
            disabled={totalItems === 0}
          >
            <Trash2 className="h-4 w-4" />
            Hapus Semua
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.75fr_1fr]">
          <div className="space-y-4">
            {checkoutItems.length === 0 ? (
              <section className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                Belom ada item di keranjang.
              </section>
            ) : (
              <>
                {grouped.locations.length > 0
                  ? renderGroup("By Location", grouped.locations)
                  : null}
                {grouped.expendables.length > 0
                  ? renderGroup("By Expendables", grouped.expendables)
                  : null}
                {grouped.bundles.length > 0
                  ? renderGroup("Bundles", grouped.bundles)
                  : null}
                {grouped.others.length > 0
                  ? renderGroup("Lainnya", grouped.others)
                  : null}
              </>
            )}
          </div>

          <aside className="h-fit rounded-xl border border-border bg-card p-4">
            <h2 className="text-lg font-semibold">Ringkasan Pesanan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ringkasan item checkout Anda.
            </p>

            <div className="mt-4 space-y-2">
              {checkoutItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum ada item di checkout.
                </p>
              ) : (
                checkoutItems.map((item) => (
                  <div
                    key={`summary-${item.id}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="line-clamp-2">{item.name}</span>
                    <span className="whitespace-nowrap font-semibold">
                      {formatPrice(item.lineTotal)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Total Item</span>
                <span className="font-semibold">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sub Total</span>
                <span className="font-semibold">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Diskon</span>
                <span className="font-semibold text-green-600">
                  -{formatPrice(discount)}
                </span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="flex items-center justify-between text-base font-bold">
              <span>Total Harga</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>

            <div className="mt-5 rounded-lg border border-border/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <TicketPercent className="h-4 w-4" />
                Referral Code
              </div>
              <div className="flex gap-2">
                <Input
                  value={referralInput}
                  onChange={(event) => setReferralInput(event.target.value)}
                  placeholder="Masukkan kode referral"
                />
                <Button type="button" onClick={applyReferral}>
                  Terapkan
                </Button>
              </div>
              {appliedReferral ? (
                <p className="mt-2 text-xs text-green-600">
                  Kode referral {appliedReferral} berhasil diterapkan.
                </p>
              ) : null}
              {referralError ? (
                <p className="mt-2 text-xs text-destructive">{referralError}</p>
              ) : null}
            </div>

            <div className="mt-5 space-y-3">
              <Button
                type="button"
                className="w-full"
                onClick={() => void handleMidtransCheckout()}
                disabled={checkoutItems.length === 0 || isPaying}
              >
                {isPaying ? "Memproses pembayaran..." : "Pembayaran"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.open(whatsappLink, "_blank", "noopener,noreferrer");
                }}
                disabled={checkoutItems.length === 0}
              >
                Order by Whatsapp
              </Button>

              {checkoutError ? (
                <p className="text-xs text-destructive">{checkoutError}</p>
              ) : null}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
