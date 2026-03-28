import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type OrderRow = {
  order_id: string;
  user_id: string;
  created_at: string;
};

type OrderSummaryRow = {
  payment_status: string | null;
  total_price: string | number | null;
};

type OrderItemRow = {
  order_id: string;
  location_id: string;
  booking_start: string;
  booking_end: string;
};

type LocationRow = {
  shooting_location_id: string;
  shooting_location_name: string;
};

type ReviewRow = {
  review_id: string;
  user_id: string;
  location_id: string;
  rating: number;
  comment: string | null;
};

type ReviewLocationRow = {
  shooting_location_id: string;
  shooting_location_name: string;
  shooting_location_city: string | null;
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
  const status = String(value || "").trim().toLowerCase();
  return status === "paid" || status === "settlement";
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
      .eq("user_id", user.id)
      .single<Pick<Profile, "role">>();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const serviceRoleClient = createServiceRoleClient();

    const [
      profilesCountResult,
      locationsCountResult,
      tagsCountResult,
      ordersCountResult,
      ordersSummaryResult,
      orderItemsCountResult,
      recentOrdersResult,
      reviewsResult,
    ] = await Promise.all([
      serviceRoleClient.from("profiles").select("user_id", { count: "exact", head: true }),
      serviceRoleClient
        .from("shooting_locations")
        .select("shooting_location_id", { count: "exact", head: true }),
      serviceRoleClient.from("tags").select("tag_id", { count: "exact", head: true }),
      serviceRoleClient.from("orders").select("order_id", { count: "exact", head: true }),
      serviceRoleClient.from("orders").select("payment_status, total_price"),
      serviceRoleClient.from("order_items").select("order_id", { count: "exact", head: true }),
      serviceRoleClient
        .from("orders")
        .select("order_id, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      serviceRoleClient.from("reviews").select("review_id, user_id, location_id, rating, comment"),
    ]);

    const totalUsers = profilesCountResult.count ?? 0;
    const totalLocations = locationsCountResult.count ?? 0;
    const totalTags = tagsCountResult.count ?? 0;
    const totalBookings = ordersCountResult.count ?? 0;

    const orderSummaryRows = (ordersSummaryResult.data ?? []) as OrderSummaryRow[];

    const bookingSummary = {
      totalOrder: orderSummaryRows.length,
      paidOrders: orderSummaryRows.filter((order) => isPaidStatus(order.payment_status)).length,
      totalLocations: orderItemsCountResult.count ?? 0,
      totalRevenue: orderSummaryRows.reduce(
        (acc, order) => acc + parseNumber(order.total_price),
        0,
      ),
    };

    const reviewRows = (reviewsResult.data ?? []) as ReviewRow[];
    const reviewLocationIds = [...new Set(reviewRows.map((review) => review.location_id))];

    let reviewLocationsMap = new Map<string, ReviewLocationRow>();

    if (reviewLocationIds.length > 0) {
      const { data: reviewLocationsData } = await serviceRoleClient
        .from("shooting_locations")
        .select("shooting_location_id, shooting_location_name, shooting_location_city")
        .in("shooting_location_id", reviewLocationIds);

      reviewLocationsMap = new Map(
        ((reviewLocationsData ?? []) as ReviewLocationRow[]).map((location) => [
          location.shooting_location_id,
          location,
        ]),
      );
    }

    const reviews: ReviewSummaryRow[] = reviewRows.map((review) => {
      const location = reviewLocationsMap.get(review.location_id);

      return {
        id: review.review_id,
        userName: `User ${review.user_id.slice(0, 8)}`,
        locationTitle: location?.shooting_location_name ?? "Lokasi tidak ditemukan",
        location: location?.shooting_location_city ?? "-",
        rating: Number(review.rating) || 0,
        comment: review.comment?.trim() || "-",
      };
    });

    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
        : "0.0";

    const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((review) => review.rating === star).length,
      pct:
        reviews.length > 0
          ? (reviews.filter((review) => review.rating === star).length / reviews.length) * 100
          : 0,
    }));

    const recentReviews = [...reviews].slice(0, 6);
    const recentOrders = (recentOrdersResult.data ?? []) as OrderRow[];

    let recentBookings: RecentBookingRow[] = [];

    if (recentOrders.length > 0) {
      const orderIds = recentOrders.map((order) => order.order_id);

      const { data: orderItemsData } = await serviceRoleClient
        .from("order_items")
        .select("order_id, location_id, booking_start, booking_end")
        .in("order_id", orderIds);

      const orderItems = (orderItemsData ?? []) as OrderItemRow[];
      const locationIds = [...new Set(orderItems.map((item) => item.location_id))];

      const { data: locationsData } = await serviceRoleClient
        .from("shooting_locations")
        .select("shooting_location_id, shooting_location_name")
        .in("shooting_location_id", locationIds);

      const locations = (locationsData ?? []) as LocationRow[];
      const locationMap = new Map(
        locations.map((location) => [location.shooting_location_id, location.shooting_location_name]),
      );

      recentBookings = recentOrders.map((order) => {
        const itemsForOrder = orderItems.filter((item) => item.order_id === order.order_id);

        const locationNames = itemsForOrder
          .map((item) => locationMap.get(item.location_id) ?? "Lokasi tidak ditemukan")
          .filter((name, index, array) => array.indexOf(name) === index);

        const sortedByStart = [...itemsForOrder].sort((a, b) =>
          a.booking_start.localeCompare(b.booking_start),
        );

        const firstItem = sortedByStart[0];
        const lastItem = sortedByStart[sortedByStart.length - 1];

        const dateRange =
          firstItem && lastItem
            ? formatDateRange(firstItem.booking_start, lastItem.booking_end)
            : "-";

        return {
          orderId: order.order_id,
          userLabel: order.user_id,
          locationNames: locationNames.length > 0 ? locationNames.join(", ") : "-",
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
