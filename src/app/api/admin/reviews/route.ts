import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type ReviewRow = {
  review_id: string;
  user_id: string;
  location_id: string;
  rating: number;
  comment: string | null;
};

type LocationRow = {
  shooting_location_id: string;
  shooting_location_name: string;
  shooting_location_city: string;
  shooting_location_image_url: string[] | null;
};

type ProfileImageRow = {
  user_uuid: string;
  avatar_url: string | null;
};

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
        .from("reviews")
        .select("review_id, user_id, location_id, rating, comment"),
      serviceRoleClient
        .from("shooting_locations")
        .select(
          "shooting_location_id, shooting_location_name, shooting_location_city, shooting_location_image_url",
        )
        .order("shooting_location_name", { ascending: true }),
    ]);

    if (reviewsError) {
      console.error("Fetch reviews error:", reviewsError);
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
    const locations = (locationsData ?? []) as LocationRow[];

    const locationOptions = [
      ...new Set(locations.map((location) => location.shooting_location_name)),
    ];

    if (reviewRows.length === 0) {
      return NextResponse.json(
        {
          reviews: [],
          locationOptions,
        },
        { status: 200 },
      );
    }

    const userIds = [...new Set(reviewRows.map((review) => review.user_id))];

    let profileImageMap = new Map<string, string | null>();

    if (userIds.length > 0) {
      const { data: profileImagesData, error: profileImagesError } =
        await serviceRoleClient
          .from("profiles")
          .select("user_uuid, avatar_url")
          .in("user_uuid", userIds);

      if (profileImagesError) {
        console.error("Profile images lookup error:", profileImagesError);
      } else {
        profileImageMap = new Map(
          ((profileImagesData ?? []) as ProfileImageRow[]).map((profileRow) => [
            profileRow.user_uuid,
            profileRow.avatar_url,
          ]),
        );
      }
    }

    const authUsers = await Promise.all(
      userIds.map(async (userId) => {
        const { data, error } =
          await serviceRoleClient.auth.admin.getUserById(userId);

        if (error || !data?.user) {
          return {
            user_id: userId,
            full_name: null,
            email: null,
          };
        }

        const metadata = (data.user.user_metadata ?? {}) as Record<
          string,
          unknown
        >;
        const fullNameCandidate =
          metadata.full_name ?? metadata.name ?? metadata.display_name;

        return {
          user_id: userId,
          full_name:
            typeof fullNameCandidate === "string"
              ? fullNameCandidate.trim() || null
              : null,
          email: data.user.email ?? null,
        };
      }),
    );

    const authUserMap = new Map(
      authUsers.map((authUser) => [authUser.user_id, authUser]),
    );
    const locationMap = new Map(
      locations.map((location) => [location.shooting_location_id, location]),
    );

    const mappedReviews = reviewRows.map((review, index) => {
      const authUser = authUserMap.get(review.user_id);
      const location = locationMap.get(review.location_id);
      const userName = authUser?.full_name || authUser?.email || review.user_id;

      return {
        id:
          review.review_id ??
          `${review.user_id}-${review.location_id}-${index}`,
        userId: review.user_id,
        locationId: review.location_id,
        userName,
        avatarUrl: profileImageMap.get(review.user_id) ?? null,
        locationTitle:
          location?.shooting_location_name ?? "Lokasi tidak ditemukan",
        locationImage:
          location?.shooting_location_image_url?.[0] ||
          "https://picsum.photos/seed/location-review/400/300",
        location: location?.shooting_location_city ?? "-",
        rating: Number(review.rating) || 0,
        comment: review.comment || "-",
      };
    });

    return NextResponse.json(
      {
        reviews: mappedReviews,
        locationOptions,
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
