"use client";

import { ArrowLeft, CalendarCheck, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
import { toast } from "sonner";

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

type ReservationApiRow = {
  id: string;
  orderId: string;
  locationId: string;
  name: string;
  city: string;
  imageUrl: string;
  bookingFrom: string;
  bookingTo: string;
  days: number;
  subtotal: number;
  paymentStatus: string;
};

type ReservationsResponse = {
  reservations?: ReservationApiRow[];
  reviewedKeys?: string[];
  message?: string;
};

type SubmitReviewResponse = {
  message?: string;
};

export default function ReservationsPage() {
  const router = useRouter();
  const [reservations, setReservations] = useState<ReservationCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        setErrorMessage(result.message || "Gagal memuat data reservasi.");
        setIsLoading(false);
        return;
      }

      const reservationItems = (result.reservations ?? [])
        .map((item) => {
          const bookingFrom = new Date(item.bookingFrom);
          const bookingTo = new Date(item.bookingTo);

          if (
            Number.isNaN(bookingFrom.getTime()) ||
            Number.isNaN(bookingTo.getTime())
          ) {
            return null;
          }

          return {
            ...item,
            bookingFrom,
            bookingTo,
          } as ReservationCardData;
        })
        .filter((item): item is ReservationCardData => item !== null);

      setReviewedKeys(new Set(result.reviewedKeys ?? []));
      setReservations(reservationItems);
      setIsLoading(false);
    };

    void loadReservations();
  }, [router]);

  const handleOpenReviewDialog = (reservation: ReservationCardData) => {
    setSelectedReservation(reservation);
    setRating(0);
    setComment("");
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedReservation) {
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

    const response = await fetch("/api/reservations/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: selectedReservation.orderId,
        location_id: selectedReservation.locationId,
        rating,
        comment: trimmedComment,
      }),
    });

    const result = (await response.json()) as SubmitReviewResponse;

    if (!response.ok) {
      if (response.status === 401) {
        router.push("/login");
      }

      toast.error(result.message || "Gagal mengirim review.");
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
