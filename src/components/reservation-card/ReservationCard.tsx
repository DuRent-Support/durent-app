import Image from "next/image";
import { CalendarCheck, MapPin } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";

export type ReservationCardData = {
  id: string;
  orderId: string;
  name: string;
  city: string;
  imageUrl: string;
  bookingFrom: Date;
  bookingTo: Date;
  days: number;
  subtotal: number;
  paymentStatus: string;
};

type ReservationStatus = {
  text: string;
  cls: string;
};

type ReservationCardProps = {
  reservation: ReservationCardData;
  status: ReservationStatus;
};

function formatPrice(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function getPaymentStatusClass(paymentStatus: string) {
  const normalizedStatus = paymentStatus.trim().toLowerCase();

  if (normalizedStatus === "paid") {
    return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  }

  if (normalizedStatus === "pending") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  if (normalizedStatus === "canceled") {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }

  return "bg-secondary text-secondary-foreground";
}

export default function ReservationCard({
  reservation,
  status,
}: ReservationCardProps) {
  return (
    <article className="rounded-2xl border border-border/40 bg-card/50 p-4">
      <div className="flex gap-4">
        <Image
          src={reservation.imageUrl}
          alt={reservation.name}
          width={112}
          height={112}
          className="h-28 w-28 rounded-xl object-cover"
        />
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-base font-semibold text-foreground">
                  {reservation.name}
                </h3>
                <Badge
                  variant="outline"
                  className="mt-1 gap-1 border-border/50 text-muted-foreground"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{reservation.city}</span>
                </Badge>
              </div>
              <Badge className={`text-[10px] font-semibold ${status.cls}`}>
                {status.text}
              </Badge>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <CalendarCheck className="h-3.5 w-3.5" />
              <Badge
                variant="secondary"
                className="bg-secondary/70 text-[11px] text-secondary-foreground"
              >
                {format(reservation.bookingFrom, "d MMM yyyy", {
                  locale: id,
                })}{" "}
                -{" "}
                {format(reservation.bookingTo, "d MMM yyyy", {
                  locale: id,
                })}
              </Badge>
              <span className="text-muted-foreground/50">•</span>
              <Badge
                variant="outline"
                className="text-[11px] text-muted-foreground"
              >
                {`${reservation.days} hari`}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground"
              >
                {`Order ${reservation.orderId}`}
              </Badge>
              <Badge
                variant="secondary"
                className={`text-[10px] uppercase tracking-[0.08em] ${getPaymentStatusClass(reservation.paymentStatus)}`}
              >
                {`Status ${reservation.paymentStatus}`}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end">
            <span className="text-sm font-semibold text-primary">
              {formatPrice(reservation.subtotal)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
