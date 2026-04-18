import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type OrderRow = {
  id: number;
  code: string;
  user_uuid: string;
  payment_status: string | null;
  grand_total_amount: string | number | null;
  created_at: string | null;
};

type OrderItemRow = {
  order_id: number;
  item_id: number;
  booking_start: string | null;
  booking_end: string | null;
};

type LocationRow = {
  id: number;
  name: string | null;
  city: string | null;
};

type ReviewRow = {
  id: number;
  user_uuid: string;
  location_id: number;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
};

type RecentBookingRow = {
  orderId: string;
  userLabel: string;
  locationNames: string;
  dateRange: string;
};

type ReviewSummaryRow = {
  id: string;
  userName: string;
  locationTitle: string;
  location: string;
  rating: number;
  comment: string;
};

type ProfileNameRow = {
  user_uuid: string;
  full_name: string | null;
};

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "-";
  }

  return `${startDate.toLocaleDateString("id-ID")} - ${endDate.toLocaleDateString("id-ID")}`;
}

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

function isPaidStatus(value: string | null | undefined) {
  const status = String(value || "")
    .trim()
    .toLowerCase();
  return status === "paid" || status === "settlement";
}

async function getTagsCount() {
  const serviceRoleClient = createServiceRoleClient();

  const tagsResult = await serviceRoleClient
    .from("tags")
    .select("tag_id", { count: "exact", head: true });

  if (!tagsResult.error) {
    return tagsResult.count ?? 0;
  }

  return 0;
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
      profilesCountResult,
      locationsCountResult,
      ordersCountResult,
      ordersSummaryResult,
      orderLocationItemsCountResult,
      recentOrdersResult,
      reviewsResult,
      tagsCount,
    ] = await Promise.all([
      serviceRoleClient
        .from("profiles")
        .select("user_uuid", { count: "exact", head: true }),
      serviceRoleClient
        .from("locations")
        .select("id", { count: "exact", head: true }),
      serviceRoleClient
        .from("orders")
        .select("id", { count: "exact", head: true }),
      serviceRoleClient
        .from("orders")
        .select(
          "id, code, user_uuid, payment_status, grand_total_amount, created_at",
        ),
      serviceRoleClient
        .from("order_items")
        .select("id", { count: "exact", head: true })
        .eq("item_type", "location"),
      serviceRoleClient
        .from("orders")
        .select(
          "id, code, user_uuid, payment_status, grand_total_amount, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(5),
      serviceRoleClient
        .from("location_reviews")
        .select("id, user_uuid, location_id, rating, comment, created_at")
        .order("created_at", { ascending: false }),
      getTagsCount(),
    ]);

    const totalUsers = profilesCountResult.count ?? 0;
    const totalLocations = locationsCountResult.count ?? 0;
    const totalTags = tagsCount;
    const totalBookings = ordersCountResult.count ?? 0;

    const orderSummaryRows = (ordersSummaryResult.data ?? []) as OrderRow[];

    const bookingSummary = {
      totalOrder: orderSummaryRows.length,
      paidOrders: orderSummaryRows.filter((order) =>
        isPaidStatus(order.payment_status),
      ).length,
      totalLocations: orderLocationItemsCountResult.count ?? 0,
      totalRevenue: orderSummaryRows.reduce(
        (acc, order) => acc + parseNumber(order.grand_total_amount),
        0,
      ),
    };

    const reviewRows = (reviewsResult.data ?? []) as ReviewRow[];
    const reviewLocationIds = [
      ...new Set(reviewRows.map((review) => review.location_id)),
    ];
    const reviewUserIds = [
      ...new Set(reviewRows.map((review) => review.user_uuid)),
    ];

    let reviewLocationsMap = new Map<number, LocationRow>();
    if (reviewLocationIds.length > 0) {
      const { data: reviewLocationsData } = await serviceRoleClient
        .from("locations")
        .select("id, name, city")
        .in("id", reviewLocationIds);

      reviewLocationsMap = new Map(
        ((reviewLocationsData ?? []) as LocationRow[]).map((location) => [
          location.id,
          location,
        ]),
      );
    }

    const profileNameMap = new Map<string, string>();
    if (reviewUserIds.length > 0) {
      const { data: profileNamesData } = await serviceRoleClient
        .from("profiles")
        .select("user_uuid, full_name")
        .in("user_uuid", reviewUserIds);

      ((profileNamesData ?? []) as ProfileNameRow[]).forEach((row) => {
        const fullName = String(row.full_name ?? "").trim();
        if (fullName) {
          profileNameMap.set(row.user_uuid, fullName);
        }
      });
    }

    const reviews: ReviewSummaryRow[] = reviewRows.map((review) => {
      const location = reviewLocationsMap.get(review.location_id);
      const userName =
        profileNameMap.get(review.user_uuid) ??
        `User ${String(review.user_uuid).slice(0, 8)}`;

      return {
        id: String(review.id),
        userName,
        locationTitle: String(location?.name ?? "Lokasi tidak ditemukan"),
        location: String(location?.city ?? "-"),
        rating: Math.max(0, Number(review.rating ?? 0)),
        comment: review.comment?.trim() || "-",
      };
    });

    const avgRating =
      reviews.length > 0
        ? (
            reviews.reduce((acc, review) => acc + review.rating, 0) /
            reviews.length
          ).toFixed(1)
        : "0.0";

    const ratingDist = [5, 4, 3, 2, 1].map((star) => {
      const count = reviews.filter((review) => review.rating === star).length;
      return {
        star,
        count,
        pct: reviews.length > 0 ? (count / reviews.length) * 100 : 0,
      };
    });

    const recentReviews = [...reviews].slice(0, 6);
    const recentOrders = (recentOrdersResult.data ?? []) as OrderRow[];

    let recentBookings: RecentBookingRow[] = [];

    if (recentOrders.length > 0) {
      const orderIds = recentOrders.map((order) => order.id);
      const recentUserIds = [
        ...new Set(recentOrders.map((order) => order.user_uuid)),
      ];

      const [orderItemsDataResult, locationsDataResult, recentProfilesResult] =
        await Promise.all([
          serviceRoleClient
            .from("order_items")
            .select("order_id, item_id, booking_start, booking_end")
            .eq("item_type", "location")
            .in("order_id", orderIds),
          serviceRoleClient.from("locations").select("id, name, city"),
          serviceRoleClient
            .from("profiles")
            .select("user_uuid, full_name")
            .in("user_uuid", recentUserIds),
        ]);

      const orderItems = (orderItemsDataResult.data ?? []) as OrderItemRow[];
      const allLocations = (locationsDataResult.data ?? []) as LocationRow[];
      const recentProfiles = (recentProfilesResult.data ??
        []) as ProfileNameRow[];

      const locationMap = new Map<number, string>(
        allLocations.map((location) => [
          location.id,
          String(location.name ?? "-"),
        ]),
      );

      const recentProfileMap = new Map<string, string>();
      recentProfiles.forEach((profileRow) => {
        const fullName = String(profileRow.full_name ?? "").trim();
        if (fullName) {
          recentProfileMap.set(profileRow.user_uuid, fullName);
        }
      });

      recentBookings = recentOrders.map((order) => {
        const itemsForOrder = orderItems.filter(
          (item) => item.order_id === order.id,
        );

        const locationNames = itemsForOrder
          .map(
            (item) =>
              locationMap.get(Number(item.item_id)) ?? "Lokasi tidak ditemukan",
          )
          .filter((name, index, array) => array.indexOf(name) === index);

        const bookingStarts = itemsForOrder
          .map((item) => item.booking_start)
          .filter((value): value is string => Boolean(value))
          .sort((a, b) => a.localeCompare(b));

        const bookingEnds = itemsForOrder
          .map((item) => item.booking_end)
          .filter((value): value is string => Boolean(value))
          .sort((a, b) => a.localeCompare(b));

        const dateRange =
          bookingStarts.length > 0 && bookingEnds.length > 0
            ? formatDateRange(
                bookingStarts[0],
                bookingEnds[bookingEnds.length - 1],
              )
            : "-";

        return {
          orderId: order.code,
          userLabel:
            recentProfileMap.get(order.user_uuid) ??
            `User ${String(order.user_uuid).slice(0, 8)}`,
          locationNames:
            locationNames.length > 0 ? locationNames.join(", ") : "-",
          dateRange,
        };
      });
    }

    return NextResponse.json(
      {
        totals: {
          users: totalUsers,
          locations: totalLocations,
          tags: totalTags,
          bookings: totalBookings,
        },
        bookingSummary,
        reviewCount: reviews.length,
        avgRating,
        ratingDist,
        recentReviews,
        recentBookings,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get admin dashboard error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data dashboard admin." },
      { status: 500 },
    );
  }
}
