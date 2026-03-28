import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type OrderRow = {
  order_id: string;
  payment_status: string | null;
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

    const { data: orderRows, error: orderError } = await supabase
      .from("orders")
      .select("order_id, payment_status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error("Fetch orders error:", orderError);
      return NextResponse.json(
        { message: "Gagal mengambil data orders." },
        { status: 500 },
      );
    }

    const orders = (orderRows ?? []) as OrderRow[];

    if (orders.length === 0) {
      return NextResponse.json(
        {
          reservations: [],
          reviewedKeys: [],
        },
        { status: 200 },
      );
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
    }

    const existingReviews = (existingReviewsData ?? []) as ExistingReviewRow[];
    const reviewedKeys = existingReviews.map(
      (review) => `${review.order_id}-${review.location_id}`,
    );

    const { data: orderItemRows, error: orderItemsError } = await supabase
      .from("order_items")
      .select("order_id, location_id, booking_start, booking_end, price, quantity")
      .in("order_id", orderIds)
      .order("booking_start", { ascending: false });

    if (orderItemsError) {
      console.error("Fetch order_items error:", orderItemsError);
      return NextResponse.json(
        { message: "Gagal mengambil data order items." },
        { status: 500 },
      );
    }

    const orderItems = (orderItemRows ?? []) as OrderItemRow[];

    if (orderItems.length === 0) {
      return NextResponse.json(
        {
          reservations: [],
          reviewedKeys,
        },
        { status: 200 },
      );
    }

    const locationIds = [...new Set(orderItems.map((item) => item.location_id))];

    const { data: locationRows, error: locationError } = await supabase
      .from("shooting_locations")
      .select(
        "shooting_location_id, shooting_location_name, shooting_location_city, shooting_location_image_url",
      )
      .in("shooting_location_id", locationIds);

    if (locationError) {
      console.error("Fetch shooting_locations error:", locationError);
      return NextResponse.json(
        { message: "Gagal mengambil data lokasi." },
        { status: 500 },
      );
    }

    const locations = (locationRows ?? []) as LocationRow[];
    const locationMap = new Map(
      locations.map((location) => [location.shooting_location_id, location]),
    );

    const reservations = orderItems
      .map((item) => {
        const order = orderMap.get(item.order_id);
        const location = locationMap.get(item.location_id);

        const from = new Date(item.booking_start);
        const to = new Date(item.booking_end);

        if (!location || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
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
          bookingFrom: from.toISOString(),
          bookingTo: to.toISOString(),
          days,
          subtotal: unitPrice * days,
          paymentStatus: String(order?.payment_status || "pending"),
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    reservations.sort((a, b) => {
      const aFrom = new Date(a.bookingFrom);
      const bFrom = new Date(b.bookingFrom);
      const aTo = new Date(a.bookingTo);
      const bTo = new Date(b.bookingTo);

      const aIsOngoing = aFrom <= today && aTo >= today;
      const bIsOngoing = bFrom <= today && bTo >= today;

      if (aIsOngoing !== bIsOngoing) {
        return aIsOngoing ? -1 : 1;
      }

      const aIsUpcoming = aFrom > today;
      const bIsUpcoming = bFrom > today;

      if (aIsUpcoming !== bIsUpcoming) {
        return aIsUpcoming ? -1 : 1;
      }

      if (aIsUpcoming && bIsUpcoming) {
        return aFrom.getTime() - bFrom.getTime();
      }

      if (aIsOngoing && bIsOngoing) {
        return aTo.getTime() - bTo.getTime();
      }

      return bTo.getTime() - aTo.getTime();
    });

    return NextResponse.json(
      {
        reservations,
        reviewedKeys,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get reservations error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data reservasi." },
      { status: 500 },
    );
  }
}
