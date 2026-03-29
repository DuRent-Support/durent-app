"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, RefreshCcw } from "lucide-react";

import PaymentCard, {
  type PendingPaymentRow,
} from "@/components/payment-card/PaymentCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

type PendingPaymentsResponse = {
  pendingPayments?: PendingPaymentRow[];
  message?: string;
};

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

    const response = await fetch("/api/payments/pending", {
      method: "GET",
      cache: "no-store",
    });

    if (response.status === 401) {
      router.push("/login");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const result = (await response.json()) as PendingPaymentsResponse;

    if (!response.ok) {
      console.error("Fetch pending payments error:", result.message);
      setPendingPayments([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setPendingPayments(result.pendingPayments ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [router]);

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
              <Link href="/locations">Kembali jelajahi lokasi</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingPayments.map((row) => (
            <PaymentCard
              key={row.order_id}
              row={row}
              nowTs={nowTs}
              activeOrderId={activeOrderId}
              onContinuePayment={(paymentRow) => {
                void continuePayment(paymentRow);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
