import { CalendarDays, ChevronDown, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export type PendingPaymentItem = {
  order_id: string;
  location_id: string;
  booking_start: string;
  booking_end: string;
  quantity: number | null;
  price: string | number | null;
  location_name: string;
};

export type PendingPaymentRow = {
  order_id: string;
  total_price: string | number | null;
  payment_status: string | null;
  created_at: string | null;
  midtrans_token: string | null;
  midtrans_expire_at: string | null;
  items: PendingPaymentItem[];
};

type PaymentCardProps = {
  row: PendingPaymentRow;
  nowTs: number;
  activeOrderId: string | null;
  onContinuePayment: (row: PendingPaymentRow) => void;
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

export default function PaymentCard({
  row,
  nowTs,
  activeOrderId,
  onContinuePayment,
}: PaymentCardProps) {
  const expiresAt = row.midtrans_expire_at ? new Date(row.midtrans_expire_at) : null;
  const msLeft = expiresAt ? expiresAt.getTime() - nowTs : 0;
  const isExpired = msLeft <= 0;

  return (
    <Card className="border-border/50">
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
            <p className="font-semibold text-foreground">{formatRupiah(row.total_price)}</p>
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
                    <p className="text-sm font-medium text-foreground">{item.location_name}</p>
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
          onClick={() => onContinuePayment(row)}
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
}