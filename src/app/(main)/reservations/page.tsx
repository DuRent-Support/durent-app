"use client";

import { ArrowLeft, CalendarCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ReservationCard, {
  type ReservationCardData,
} from "@/components/reservation-card/ReservationCard";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const sanitized = value.replace(/[^0-9]/g, "");
    return Number.parseInt(sanitized, 10) || 0;
  }

  return 0;
}

function getStatusLabel(from: Date, to: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (to < today) {
    return { text: "Selesai", cls: "bg-muted text-muted-foreground" };
  }

  if (from <= today && to >= today) {
    return { text: "Berlangsung", cls: "bg-primary/20 text-primary" };
  }

  return { text: "Akan Datang", cls: "bg-accent text-accent-foreground" };
}

type OrderRow = {
  order_id: string;
  payment_status: string | null;
  created_at: string | null;
};

type OrderItemRow = {
  order_id: string;
  location_id: string;
  booking_start: string;
  booking_end: string;
  price: string | number | null;
  quantity: number | null;
};

type LocationRow = {
  shooting_location_id: string;
  shooting_location_name: string;
  shooting_location_city: string;
  shooting_location_image_url: string[] | null;
};

export default function ReservationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [reservations, setReservations] = useState<ReservationCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadReservations = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        setErrorMessage("Gagal memverifikasi user.");
        setIsLoading(false);
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: orderRows, error: orderError } = await supabase
        .from("orders")
        .select("order_id, payment_status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (orderError) {
        console.error("Fetch orders error:", orderError);
        setErrorMessage("Gagal mengambil data orders.");
        setIsLoading(false);
        return;
      }

      const orders = (orderRows ?? []) as OrderRow[];

      if (orders.length === 0) {
        setReservations([]);
        setIsLoading(false);
        return;
      }

      const orderIds = orders.map((order) => order.order_id);
      const orderMap = new Map(orders.map((order) => [order.order_id, order]));

      const { data: orderItemRows, error: orderItemsError } = await supabase
        .from("order_items")
        .select(
          "order_id, location_id, booking_start, booking_end, price, quantity",
        )
        .in("order_id", orderIds)
        .order("booking_start", { ascending: false });

      if (orderItemsError) {
        console.error("Fetch order_items error:", orderItemsError);
        setErrorMessage("Gagal mengambil data order items.");
        setIsLoading(false);
        return;
      }

      const orderItems = (orderItemRows ?? []) as OrderItemRow[];

      if (orderItems.length === 0) {
        setReservations([]);
        setIsLoading(false);
        return;
      }

      const locationIds = [
        ...new Set(orderItems.map((item) => item.location_id)),
      ];

      const { data: locationRows, error: locationError } = await supabase
        .from("shooting_locations")
        .select(
          "shooting_location_id, shooting_location_name, shooting_location_city, shooting_location_image_url",
        )
        .in("shooting_location_id", locationIds);

      if (locationError) {
        console.error("Fetch shooting_locations error:", locationError);
        setErrorMessage("Gagal mengambil data lokasi.");
        setIsLoading(false);
        return;
      }

      const locations = (locationRows ?? []) as LocationRow[];
      const locationMap = new Map(
        locations.map((location) => [location.shooting_location_id, location]),
      );

      const reservationItems: ReservationCardData[] = orderItems
        .map((item) => {
          const order = orderMap.get(item.order_id);
          const location = locationMap.get(item.location_id);

          const from = new Date(item.booking_start);
          const to = new Date(item.booking_end);

          if (
            !location ||
            Number.isNaN(from.getTime()) ||
            Number.isNaN(to.getTime())
          ) {
            return null;
          }

          const unitPrice = parseNumber(item.price);
          const days = Math.max(1, Number(item.quantity ?? 1));

          return {
            id: `${item.order_id}-${item.location_id}-${item.booking_start}`,
            orderId: item.order_id,
            name: location.shooting_location_name,
            city: location.shooting_location_city,
            imageUrl: location.shooting_location_image_url?.[0] || "/hero.webp",
            bookingFrom: from,
            bookingTo: to,
            days,
            subtotal: unitPrice * days,
            paymentStatus: String(order?.payment_status || "pending"),
          };
        })
        .filter((item): item is ReservationCardData => item !== null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      reservationItems.sort((a, b) => {
        const aIsOngoing = a.bookingFrom <= today && a.bookingTo >= today;
        const bIsOngoing = b.bookingFrom <= today && b.bookingTo >= today;

        if (aIsOngoing !== bIsOngoing) {
          return aIsOngoing ? -1 : 1;
        }

        const aIsUpcoming = a.bookingFrom > today;
        const bIsUpcoming = b.bookingFrom > today;

        if (aIsUpcoming !== bIsUpcoming) {
          return aIsUpcoming ? -1 : 1;
        }

        if (aIsUpcoming && bIsUpcoming) {
          return a.bookingFrom.getTime() - b.bookingFrom.getTime();
        }

        if (aIsOngoing && bIsOngoing) {
          return a.bookingTo.getTime() - b.bookingTo.getTime();
        }

        return b.bookingTo.getTime() - a.bookingTo.getTime();
      });

      setReservations(reservationItems);
      setIsLoading(false);
    };

    void loadReservations();
  }, [router, supabase]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Reservasi Saya
        </h1>
        {reservations.length > 0 ? (
          <span className="rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
            {reservations.length} booking
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-border/40 bg-card/40"
            />
          ))}
        </div>
      ) : errorMessage ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-3xl border border-dashed border-destructive/40 bg-destructive/5 px-6 py-12 text-center">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Gagal Memuat Reservasi
          </h2>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">
            {errorMessage}
          </p>
          <Button onClick={() => window.location.reload()}>Coba lagi</Button>
        </div>
      ) : reservations.length === 0 ? (
        <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-dashed border-border/50 bg-card/30 px-6 py-16 text-center">
          <CalendarCheck className="mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold text-foreground">
            Belum Ada Reservasi
          </h2>
          <p className="mb-6 mt-2 text-sm text-muted-foreground">
            Anda belum memiliki booking lokasi apapun.
          </p>
          <Button onClick={() => router.push("/")}>Jelajahi Lokasi</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {reservations.map((reservation) => {
            const status = getStatusLabel(
              reservation.bookingFrom,
              reservation.bookingTo,
            );

            return (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                status={status}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
