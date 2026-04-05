import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

type ReviewRow = {
  review_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
};

type ProfileRow = {
  user_uuid: string;
  avatar_url: string | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const locationId = Number(id);

    if (!Number.isInteger(locationId)) {
      return NextResponse.json(
        { message: "Location id tidak valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data: location, error: locationError } = await serviceRoleClient
      .from("locations")
      .select("id")
      .eq("id", locationId)
      .maybeSingle();

    if (locationError) {
      console.error("Check location error:", locationError);
      return NextResponse.json(
        { message: "Gagal memverifikasi lokasi." },
        { status: 500 },
      );
    }

    if (!location) {
      return NextResponse.json(
        { message: "Lokasi tidak ditemukan." },
        { status: 404 },
      );
    }

    const { data: reviewRows, error: reviewsError } = await serviceRoleClient
      .from("reviews")
      .select("review_id, user_id, rating, comment, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false });

    if (reviewsError) {
      console.error("Fetch location reviews error:", reviewsError);
      return NextResponse.json(
        { message: "Gagal mengambil data review lokasi." },
        { status: 500 },
      );
    }

    const reviews = (reviewRows ?? []) as ReviewRow[];

    if (reviews.length === 0) {
      return NextResponse.json({ reviews: [] }, { status: 200 });
    }

    const userIds = [...new Set(reviews.map((review) => review.user_id))];

    const { data: profileRows, error: profilesError } = await serviceRoleClient
      .from("profiles")
      .select("user_uuid, avatar_url")
      .in("user_uuid", userIds);

    if (profilesError) {
      console.error("Fetch profile images error:", profilesError);
    }

    const profileImageMap = new Map(
      ((profileRows ?? []) as ProfileRow[]).map((profile) => [
        profile.user_uuid,
        profile.avatar_url,
      ]),
    );

    const mappedReviews = reviews.map((review) => ({
      id: review.review_id,
      userLabel: `User ${review.user_id.slice(0, 8)}`,
      avatarUrl: profileImageMap.get(review.user_id) ?? null,
      rating: Number(review.rating) || 0,
      comment: review.comment?.trim() || "-",
      createdAt: review.created_at,
    }));

    return NextResponse.json({ reviews: mappedReviews }, { status: 200 });
  } catch (error) {
    console.error("Get location reviews API error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil review lokasi." },
      { status: 500 },
    );
  }
}
