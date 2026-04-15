import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

const MEDIA_BUCKET = "media";

type ReviewRow = {
  id: number;
  user_uuid: string;
  location_id: number;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
};

type LocationRow = {
  id: number;
  name: string | null;
  city: string | null;
};

type LocationListItem = {
  id: number;
  name: string;
  city: string;
  imageUrl: string;
};

type LocationImageRow = {
  location_id: number;
  url: string | null;
  position: number | null;
};

type ProfileRow = {
  user_uuid: string;
  full_name: string | null;
  avatar_url: string | null;
};

type SignedUrlRow = {
  signedUrl?: string;
  error?: string;
};

function pickLowerPosition(
  current: { url: string; position: number } | undefined,
  next: { url: string; position: number },
) {
  if (!current) {
    return next;
  }

  return next.position < current.position ? next : current;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_uuid", user.id)
      .single<Pick<Profile, "role">>();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const serviceRoleClient = createServiceRoleClient();

    const [
      { data: reviewsData, error: reviewsError },
      { data: locationsData, error: locationsError },
    ] = await Promise.all([
      serviceRoleClient
        .from("location_reviews")
        .select("id, user_uuid, location_id, rating, comment, created_at")
        .order("created_at", { ascending: false }),
      serviceRoleClient.from("locations").select("id, name, city"),
    ]);

    if (reviewsError) {
      console.error("Fetch location_reviews error:", reviewsError);
      return NextResponse.json(
        { message: "Gagal mengambil data review." },
        { status: 500 },
      );
    }

    if (locationsError) {
      console.error("Fetch locations error:", locationsError);
      return NextResponse.json(
        { message: "Gagal mengambil data lokasi." },
        { status: 500 },
      );
    }

    const reviewRows = (reviewsData ?? []) as ReviewRow[];
    const locations = ((locationsData ?? []) as LocationRow[]).sort((a, b) =>
      String(a.name ?? "").localeCompare(String(b.name ?? ""), "id"),
    );

    const locationMap = new Map<number, LocationRow>(
      locations.map((location) => [location.id, location]),
    );

    const locationOptions = locations.map((location) => ({
      id: location.id,
      name: String(location.name ?? `Lokasi #${location.id}`),
    }));

    if (reviewRows.length === 0) {
      return NextResponse.json(
        {
          reviews: [],
          locationOptions,
        },
        { status: 200 },
      );
    }

    const locationIds = [...new Set(locations.map((location) => location.id))];
    const userIds = [...new Set(reviewRows.map((review) => review.user_uuid))];

    const [locationImagesResult, profilesResult] = await Promise.all([
      locationIds.length > 0
        ? serviceRoleClient
            .from("location_images")
            .select("location_id, url, position")
            .in("location_id", locationIds)
        : Promise.resolve({ data: [], error: null }),
      userIds.length > 0
        ? serviceRoleClient
            .from("profiles")
            .select("user_uuid, full_name, avatar_url")
            .in("user_uuid", userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (locationImagesResult.error) {
      console.error("Fetch location_images error:", locationImagesResult.error);
    }

    if (profilesResult.error) {
      console.error("Fetch profiles error:", profilesResult.error);
    }

    const imageRows = (locationImagesResult.data ?? []) as LocationImageRow[];
    const imagePaths = Array.from(
      new Set(
        imageRows
          .map((row) => String(row.url ?? "").trim())
          .filter((path) => path.length > 0),
      ),
    );

    const signedUrlMap = new Map<string, string>();

    if (imagePaths.length > 0) {
      const signedResult = await serviceRoleClient.storage
        .from(MEDIA_BUCKET)
        .createSignedUrls(imagePaths, 60 * 60);

      if (!signedResult.error) {
        (signedResult.data ?? []).forEach((item, index) => {
          const row = item as SignedUrlRow;
          if (!row.error && row.signedUrl) {
            signedUrlMap.set(imagePaths[index], row.signedUrl);
          }
        });
      }
    }

    const bestImageByLocation = new Map<
      number,
      { url: string; position: number }
    >();
    imageRows.forEach((row) => {
      const locationId = Number(row.location_id);
      const rawUrl = String(row.url ?? "").trim();

      if (!Number.isInteger(locationId) || locationId <= 0 || !rawUrl) {
        return;
      }

      const resolvedUrl = signedUrlMap.get(rawUrl) ?? rawUrl;
      const candidate = {
        url: resolvedUrl,
        position: Number.isFinite(Number(row.position))
          ? Number(row.position)
          : Number.MAX_SAFE_INTEGER,
      };

      bestImageByLocation.set(
        locationId,
        pickLowerPosition(bestImageByLocation.get(locationId), candidate),
      );
    });

    const profileMap = new Map<string, ProfileRow>();
    ((profilesResult.data ?? []) as ProfileRow[]).forEach((profileRow) => {
      profileMap.set(profileRow.user_uuid, profileRow);
    });

    const mappedReviews = reviewRows.map((review) => {
      const location = locationMap.get(review.location_id);
      const profileRow = profileMap.get(review.user_uuid);
      const fullName = String(profileRow?.full_name ?? "").trim();

      return {
        id: String(review.id),
        userId: review.user_uuid,
        userName: fullName || `User ${String(review.user_uuid).slice(0, 8)}`,
        avatarUrl: profileRow?.avatar_url ?? null,
        locationId: review.location_id,
        locationName: String(location?.name ?? "Lokasi tidak ditemukan"),
        locationCity: String(location?.city ?? "-"),
        locationImageUrl:
          bestImageByLocation.get(review.location_id)?.url ??
          "/placeholder_durent.webp",
        rating: Math.max(0, Number(review.rating ?? 0)),
        comment: String(review.comment ?? "").trim(),
        createdAt: review.created_at,
      };
    });

    const locationsList: LocationListItem[] = locations.map((location) => ({
      id: location.id,
      name: String(location.name ?? `Lokasi #${location.id}`),
      city: String(location.city ?? "-"),
      imageUrl: bestImageByLocation.get(location.id)?.url ?? "/placeholder_durent.webp",
    }));

    return NextResponse.json(
      {
        reviews: mappedReviews,
        locationOptions,
        locations: locationsList,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get admin reviews error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data review." },
      { status: 500 },
    );
  }
}
