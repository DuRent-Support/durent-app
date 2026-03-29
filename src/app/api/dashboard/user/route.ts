import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type OrderRow = {
  order_id: string;
  total_price: string | number | null;
  payment_status: string | null;
  created_at: string | null;
  midtrans_token: string | null;
  midtrans_expire_at: string | null;
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

type BookingState = "upcoming" | "ongoing" | "finished";

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
  const status = String(value ?? "").trim().toLowerCase();
  return status === "paid" || status === "settlement";
}

function isPendingStatus(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase() === "pending";
}

function getBookingState(from: Date, to: Date): BookingState {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (to < today) {
    return "finished";
  }

  if (from <= today && to >= today) {
    return "ongoing";
  }

  return "upcoming";
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
      .select(
        "order_id, total_price, payment_status, created_at, midtrans_token, midtrans_expire_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error("Fetch orders dashboard error:", orderError);
      return NextResponse.json(
        { message: "Gagal mengambil data order dashboard." },
        { status: 500 },
      );
    }

    const orders = (orderRows ?? []) as OrderRow[];

    if (orders.length === 0) {
      return NextResponse.json(
        {
          summary: {
            totalBookings: 0,
            upcomingBookings: 0,
            ongoingBookings: 0,
            finishedBookings: 0,
            pendingPayments: 0,
            toReviewCount: 0,
            totalSpent: 0,
          },
          nextBookings: [],
          pendingPayments: [],
        },
        { status: 200 },
      );
    }

    const orderIds = orders.map((order) => order.order_id);

    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select("order_id, location_id, booking_start, booking_end, price, quantity")
      .in("order_id", orderIds)
      .order("booking_start", { ascending: true });

    if (orderItemsError) {
      console.error("Fetch order items dashboard error:", orderItemsError);
      return NextResponse.json(
        { message: "Gagal mengambil data booking dashboard." },
        { status: 500 },
      );
    }

    const orderItems = (orderItemsData ?? []) as OrderItemRow[];
    const locationIds = [...new Set(orderItems.map((item) => item.location_id))];

    let locationMap = new Map<string, LocationRow>();

    if (locationIds.length > 0) {
      const { data: locationRows, error: locationError } = await supabase
        .from("shooting_locations")
        .select(
          "shooting_location_id, shooting_location_name, shooting_location_city, shooting_location_image_url",
        )
        .in("shooting_location_id", locationIds);

      if (locationError) {
        console.error("Fetch locations dashboard error:", locationError);
      } else {
        const locations = (locationRows ?? []) as LocationRow[];
        locationMap = new Map(
          locations.map((location) => [location.shooting_location_id, location]),
        );
      }
    }

    const dashboardBookings = orderItems
      .map((item) => {
        const location = locationMap.get(item.location_id);
        const from = new Date(item.booking_start);
        const to = new Date(item.booking_end);

        if (!location || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
          return null;
        }

        const days = Math.max(1, Number(item.quantity ?? 1));
        const unitPrice = parseNumber(item.price);

        return {
          id: `${item.order_id}-${item.location_id}-${item.booking_start}`,
          orderId: item.order_id,
          locationId: item.location_id,
          locationName: location.shooting_location_name,
          city: location.shooting_location_city,
          imageUrl: location.shooting_location_image_url?.[0] || "/hero.webp",
          bookingFrom: from.toISOString(),
          bookingTo: to.toISOString(),
          days,
          subtotal: unitPrice * days,
          state: getBookingState(from, to),
          paymentStatus: orders.find((order) => order.order_id === item.order_id)
            ?.payment_status || "pending",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    let toReviewCount = 0;

    const finishedBookingKeys = dashboardBookings
      .filter((booking) => booking.state === "finished")
      .map((booking) => `${booking.orderId}-${booking.locationId}`);

    if (finishedBookingKeys.length > 0) {
      const { data: reviewRows, error: reviewError } = await supabase
        .from("reviews")
        .select("order_id, location_id")
        .eq("user_id", user.id)
        .in("order_id", orderIds);

      if (reviewError) {
        console.warn("Fetch review dashboard warning:", reviewError);
      } else {
        const existingReviews = (reviewRows ?? []) as ExistingReviewRow[];
        const reviewedKeys = new Set(
          existingReviews.map((review) => `${review.order_id}-${review.location_id}`),
        );

        toReviewCount = finishedBookingKeys.filter((key) => !reviewedKeys.has(key)).length;
      }
    }

    const pendingPayments = orders
      .filter(
        (order) => isPendingStatus(order.payment_status) && Boolean(order.midtrans_token),
      )
      .map((order) => ({
        orderId: order.order_id,
        totalPrice: parseNumber(order.total_price),
        createdAt: order.created_at,
        expiresAt: order.midtrans_expire_at,
      }));

    const nextBookings = [...dashboardBookings]
      .filter((booking) => booking.state === "ongoing" || booking.state === "upcoming")
      .sort((a, b) => {
        if (a.state !== b.state) {
          return a.state === "ongoing" ? -1 : 1;
        }

        return a.bookingFrom.localeCompare(b.bookingFrom);
      })
      .slice(0, 5);

    return NextResponse.json(
      {
        summary: {
          totalBookings: dashboardBookings.length,
          upcomingBookings: dashboardBookings.filter((booking) => booking.state === "upcoming")
            .length,
          ongoingBookings: dashboardBookings.filter((booking) => booking.state === "ongoing")
            .length,
          finishedBookings: dashboardBookings.filter((booking) => booking.state === "finished")
            .length,
          pendingPayments: pendingPayments.length,
          toReviewCount,
          totalSpent: orders
            .filter((order) => isPaidStatus(order.payment_status))
            .reduce((sum, order) => sum + parseNumber(order.total_price), 0),
        },
        nextBookings,
        pendingPayments: pendingPayments.slice(0, 5),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get user dashboard error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data dashboard user." },
      { status: 500 },
    );
  }
}
