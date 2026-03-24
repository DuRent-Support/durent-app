"use client";

import { ArrowLeft, CalendarCheck, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ReservationCard, {
  type ReservationCardData,
} from "@/components/reservation-card/ReservationCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

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

type ExistingReviewRow = {
  order_id: string;
  location_id: string;
};

export default function ReservationsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [reservations, setReservations] = useState<ReservationCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] =
    useState<ReservationCardData | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewedKeys, setReviewedKeys] = useState<Set<string>>(new Set());

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

      setCurrentUserId(user.id);

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

      const { data: existingReviewsData, error: existingReviewsError } =
        await supabase
          .from("reviews")
          .select("order_id, location_id")
          .eq("user_id", user.id)
          .in("order_id", orderIds);

      if (existingReviewsError) {
        console.warn("Fetch existing reviews warning:", existingReviewsError);
        setReviewedKeys(new Set());
      } else {
        const existingReviews =
          (existingReviewsData ?? []) as ExistingReviewRow[];
        setReviewedKeys(
          new Set(
            existingReviews.map(
              (review) => `${review.order_id}-${review.location_id}`,
            ),
          ),
        );
      }

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
            locationId: item.location_id,
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

  const handleOpenReviewDialog = (reservation: ReservationCardData) => {
    setSelectedReservation(reservation);
    setRating(0);
    setComment("");
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReservation || !currentUserId) {
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error("Pilih rating 1 sampai 5.");
      return;
    }

    const trimmedComment = comment.trim();

    if (!trimmedComment) {
      toast.error("Komentar wajib diisi.");
      return;
    }

    setIsSubmittingReview(true);

    const payload = {
      user_id: currentUserId,
      order_id: selectedReservation.orderId,
      location_id: selectedReservation.locationId,
      rating,
      comment: trimmedComment,
    };

    const { error } = await supabase.from("reviews").insert(payload);

    if (error) {
      console.error("Submit review error:", error);
      toast.error("Gagal mengirim review. Cek struktur tabel reviews.");
      setIsSubmittingReview(false);
      return;
    }

    setReviewedKeys((prev) => {
      const next = new Set(prev);
      next.add(`${selectedReservation.orderId}-${selectedReservation.locationId}`);
      return next;
    });

    toast.success("Review berhasil dikirim.");
    setReviewDialogOpen(false);
    setSelectedReservation(null);
    setRating(0);
    setComment("");
    setIsSubmittingReview(false);
  };

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
            const reviewKey = `${reservation.orderId}-${reservation.locationId}`;
            const hasReviewed = reviewedKeys.has(reviewKey);
            const canReview = status.text === "Selesai";

            return (
              <ReservationCard
                key={reservation.id}
                reservation={reservation}
                status={status}
                action={
                  canReview ? (
                    hasReviewed ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        Sudah direview
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenReviewDialog(reservation)}
                      >
                        Review
                      </Button>
                    )
                  ) : null
                }
              />
            );
          })}
        </div>
      )}

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Review: {selectedReservation?.name ?? "Lokasi"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Rating</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className="rounded-md p-1 transition-colors hover:bg-accent"
                    aria-label={`Pilih rating ${value}`}
                  >
                    <Star
                      className={`h-6 w-6 ${
                        value <= rating
                          ? "fill-primary text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="review-comment" className="mb-2 block">
                Komentar
              </Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Tulis pengalaman kamu tentang lokasi ini"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReviewDialogOpen(false)}
              disabled={isSubmittingReview}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={() => void handleSubmitReview()}
              disabled={isSubmittingReview}
            >
              {isSubmittingReview ? "Mengirim..." : "Kirim Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
