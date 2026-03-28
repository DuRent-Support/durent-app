import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SubmitReviewBody = {
  order_id?: string;
  location_id?: string;
  rating?: number;
  comment?: string;
};

type ShootingLocationRateRow = {
  shooting_location_rate: number | string | null;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SubmitReviewBody;
    const orderId = String(body.order_id || "").trim();
    const locationId = String(body.location_id || "").trim();
    const rating = Number(body.rating || 0);
    const comment = String(body.comment || "").trim();

    if (!orderId || !locationId) {
      return NextResponse.json(
        { message: "Data order atau lokasi tidak valid." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: "Rating harus di antara 1 sampai 5." },
        { status: 400 },
      );
    }

    if (!comment) {
      return NextResponse.json(
        { message: "Komentar wajib diisi." },
        { status: 400 },
      );
    }

    const { data: ownedOrder, error: ownedOrderError } = await supabase
      .from("orders")
      .select("order_id")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ownedOrderError) {
      console.error("Check owned order error:", ownedOrderError);
      return NextResponse.json(
        { message: "Gagal memverifikasi order." },
        { status: 500 },
      );
    }

    if (!ownedOrder) {
      return NextResponse.json(
        { message: "Order tidak ditemukan untuk user ini." },
        { status: 403 },
      );
    }

    const { data: orderItem, error: orderItemError } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("order_id", orderId)
      .eq("location_id", locationId)
      .maybeSingle();

    if (orderItemError) {
      console.error("Check order item error:", orderItemError);
      return NextResponse.json(
        { message: "Gagal memverifikasi item order." },
        { status: 500 },
      );
    }

    if (!orderItem) {
      return NextResponse.json(
        { message: "Item order tidak ditemukan." },
        { status: 400 },
      );
    }

    const { data: existingReview, error: existingReviewError } = await supabase
      .from("reviews")
      .select("review_id")
      .eq("user_id", user.id)
      .eq("order_id", orderId)
      .eq("location_id", locationId)
      .maybeSingle();

    if (existingReviewError) {
      console.error("Check existing review error:", existingReviewError);
      return NextResponse.json(
        { message: "Gagal memverifikasi review sebelumnya." },
        { status: 500 },
      );
    }

    if (existingReview) {
      return NextResponse.json(
        { message: "Review untuk order dan lokasi ini sudah ada." },
        { status: 409 },
      );
    }

    const { data: locationRateRow, error: locationRateError } = await supabase
      .from("shooting_locations")
      .select("shooting_location_rate")
      .eq("shooting_location_id", locationId)
      .maybeSingle<ShootingLocationRateRow>();

    if (locationRateError) {
      console.error("Fetch shooting location rate error:", locationRateError);
      return NextResponse.json(
        { message: "Gagal mengambil data rate lokasi." },
        { status: 500 },
      );
    }

    if (!locationRateRow) {
      return NextResponse.json(
        { message: "Lokasi tidak ditemukan." },
        { status: 404 },
      );
    }

    const { count: existingReviewsCount, error: reviewCountError } = await supabase
      .from("reviews")
      .select("review_id", { count: "exact", head: true })
      .eq("location_id", locationId);

    if (reviewCountError) {
      console.error("Count reviews error:", reviewCountError);
      return NextResponse.json(
        { message: "Gagal menghitung jumlah review lokasi." },
        { status: 500 },
      );
    }

    const oldAvgRaw = locationRateRow.shooting_location_rate;
    const oldAvg =
      oldAvgRaw === null || oldAvgRaw === undefined
        ? null
        : Number(oldAvgRaw);
    const count = Number(existingReviewsCount ?? 0);

    const newAvg =
      oldAvg === null || !Number.isFinite(oldAvg)
        ? rating
        : ((oldAvg * count) + rating) / (count + 1);

    const { data: insertedReview, error: insertError } = await supabase
      .from("reviews")
      .insert({
        user_id: user.id,
        order_id: orderId,
        location_id: locationId,
        rating,
        comment,
      })
      .select("review_id")
      .single();

    if (insertError) {
      console.error("Submit review error:", insertError);
      return NextResponse.json(
        { message: "Gagal mengirim review." },
        { status: 500 },
      );
    }

    const { error: updateLocationRateError } = await supabase
      .from("shooting_locations")
      .update({ shooting_location_rate: newAvg })
      .eq("shooting_location_id", locationId);

    if (updateLocationRateError) {
      console.error("Update shooting location rate error:", updateLocationRateError);

      if (insertedReview?.review_id) {
        const { error: rollbackError } = await supabase
          .from("reviews")
          .delete()
          .eq("review_id", insertedReview.review_id);

        if (rollbackError) {
          console.error("Rollback inserted review error:", rollbackError);
        }
      }

      return NextResponse.json(
        { message: "Gagal memperbarui rating lokasi." },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: "Review berhasil dikirim." }, { status: 201 });
  } catch (error) {
    console.error("Submit review API error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengirim review." },
      { status: 500 },
    );
  }
}
