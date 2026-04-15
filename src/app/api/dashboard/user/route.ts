import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "media";

type OrderRow = {
  id: number;
  code: string;
  grand_total_amount: string | number | null;
  payment_status: string | null;
  created_at: string | null;
  midtrans_token: string | null;
  midtrans_expires_at: string | null;
};

type OrderItemRow = {
  order_id: number;
  item_id: number;
  booking_start: string | null;
  booking_end: string | null;
  unit_price_snapshot: string | number | null;
  quantity: number | null;
};

type LocationRow = {
  id: number;
  name: string | null;
  city: string | null;
};

type LocationImageRow = {
  location_id: number;
  url: string | null;
  position: number | null;
};

type ExistingReviewRow = {
  order_id: number;
  location_id: number;
};

type SignedUrlRow = {
  signedUrl?: string;
  error?: string;
};

type BookingState = "upcoming" | "ongoing" | "finished";

type RecentOrder = {
  orderId: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string | null;
  locationItemCount: number;
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

function isPaidStatus(value: string | null | undefined) {
  const status = String(value ?? "")
    .trim()
    .toLowerCase();
  return status === "paid" || status === "settlement";
}

function isPendingStatus(value: string | null | undefined) {
  return (
    String(value ?? "")
      .trim()
      .toLowerCase() === "pending"
  );
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

    const { data: orderRows, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, code, grand_total_amount, payment_status, created_at, midtrans_token, midtrans_expires_at",
      )
      .eq("user_uuid", user.id)
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
            totalOrders: 0,
            paidOrders: 0,
            pendingOrders: 0,
            paidLocationBookings: 0,
            reviewedLocations: 0,
            pendingPayments: 0,
            totalSpent: 0,
          },
          recentOrders: [],
          pendingPayments: [],
        },
        { status: 200 },
      );
    }

    const orderIds = orders.map((order) => order.id);

    const orderCodeById = new Map<number, string>();
    orders.forEach((order) => {
      orderCodeById.set(order.id, order.code);
    });

    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select(
        "order_id, item_id, booking_start, booking_end, unit_price_snapshot, quantity",
      )
      .eq("item_type", "location")
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
    const locationIds = [
      ...new Set(orderItems.map((item) => Number(item.item_id))),
    ].filter((id) => Number.isInteger(id) && id > 0);

    let locationMap = new Map<number, LocationRow>();
    const locationImageMap = new Map<number, string>();

    if (locationIds.length > 0) {
      const [locationRowsResult, locationImagesResult] = await Promise.all([
        supabase
          .from("locations")
          .select("id, name, city")
          .in("id", locationIds),
        supabase
          .from("location_images")
          .select("location_id, url, position")
          .in("location_id", locationIds),
      ]);

      if (locationRowsResult.error) {
        console.error(
          "Fetch locations dashboard error:",
          locationRowsResult.error,
        );
      } else {
        const locations = (locationRowsResult.data ?? []) as LocationRow[];
        locationMap = new Map(
          locations.map((location) => [location.id, location]),
        );
      }

      if (locationImagesResult.error) {
        console.error(
          "Fetch location images dashboard error:",
          locationImagesResult.error,
        );
      } else {
        const imageRows = (locationImagesResult.data ??
          []) as LocationImageRow[];
        const imagePaths = Array.from(
          new Set(
            imageRows
              .map((row) => String(row.url ?? "").trim())
              .filter((path) => path.length > 0),
          ),
        );

        const signedUrlMap = new Map<string, string>();

        if (imagePaths.length > 0) {
          const signedResult = await supabase.storage
            .from(MEDIA_BUCKET)
            .createSignedUrls(imagePaths, 60 * 60);

          if (!signedResult.error) {
            (signedResult.data ?? []).forEach((item, index) => {
              const signedRow = item as SignedUrlRow;
              if (!signedRow.error && signedRow.signedUrl) {
                signedUrlMap.set(imagePaths[index], signedRow.signedUrl);
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

        bestImageByLocation.forEach((value, key) => {
          locationImageMap.set(key, value.url);
        });
      }
    }

    const dashboardBookings = orderItems
      .map((item) => {
        const locationId = Number(item.item_id);
        const location = locationMap.get(locationId);
        const from = item.booking_start ? new Date(item.booking_start) : null;
        const to = item.booking_end ? new Date(item.booking_end) : null;

        if (
          !location ||
          !from ||
          !to ||
          Number.isNaN(from.getTime()) ||
          Number.isNaN(to.getTime())
        ) {
          return null;
        }

        const days = Math.max(1, Number(item.quantity ?? 1));
        const unitPrice = parseNumber(item.unit_price_snapshot);
        const orderCode =
          orderCodeById.get(item.order_id) ?? String(item.order_id);

        return {
          id: `${item.order_id}-${locationId}-${item.booking_start}`,
          orderId: orderCode,
          locationId: String(locationId),
          locationName: String(location.name ?? "Lokasi"),
          city: String(location.city ?? "-"),
          imageUrl:
            locationImageMap.get(locationId) ?? "/placeholder_durent.webp",
          bookingFrom: from.toISOString(),
          bookingTo: to.toISOString(),
          days,
          subtotal: unitPrice * days,
          state: getBookingState(from, to),
          paymentStatus:
            orders.find((order) => order.id === item.order_id)
              ?.payment_status || "pending",
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const paidDashboardBookings = dashboardBookings.filter((booking) =>
      isPaidStatus(booking.paymentStatus),
    );

    const paidOrderIds = new Set<number>(
      orders
        .filter((order) => isPaidStatus(order.payment_status))
        .map((order) => order.id),
    );

    let reviewedLocations = 0;
    const { data: reviewRows, error: reviewError } = await supabase
      .from("location_reviews")
      .select("order_id, location_id")
      .eq("user_uuid", user.id)
      .in("order_id", orderIds);

    if (reviewError) {
      console.warn("Fetch review dashboard warning:", reviewError);
    } else {
      const existingReviews = (reviewRows ?? []) as ExistingReviewRow[];
      reviewedLocations = new Set(
        existingReviews.map((review) => Number(review.location_id)),
      ).size;
    }

    const pendingPayments = orders
      .filter(
        (order) =>
          isPendingStatus(order.payment_status) &&
          Boolean(order.midtrans_token),
      )
      .map((order) => ({
        orderId: order.code,
        totalPrice: parseNumber(order.grand_total_amount),
        createdAt: order.created_at,
        expiresAt: order.midtrans_expires_at,
      }));

    const locationItemsByOrderId = new Map<number, number>();
    orderItems.forEach((item) => {
      const current = locationItemsByOrderId.get(item.order_id) ?? 0;
      locationItemsByOrderId.set(item.order_id, current + 1);
    });

    const recentOrders: RecentOrder[] = orders.slice(0, 5).map((order) => ({
      orderId: order.code,
      paymentStatus: String(order.payment_status ?? "pending"),
      totalAmount: parseNumber(order.grand_total_amount),
      createdAt: order.created_at,
      locationItemCount: locationItemsByOrderId.get(order.id) ?? 0,
    }));

    return NextResponse.json(
      {
        summary: {
          totalOrders: orders.length,
          paidOrders: orders.filter((order) =>
            isPaidStatus(order.payment_status),
          ).length,
          pendingOrders: orders.filter((order) =>
            isPendingStatus(order.payment_status),
          ).length,
          paidLocationBookings: paidDashboardBookings.length,
          reviewedLocations,
          pendingPayments: pendingPayments.length,
          totalSpent: orders
            .filter((order) => isPaidStatus(order.payment_status))
            .reduce(
              (sum, order) => sum + parseNumber(order.grand_total_amount),
              0,
            ),
        },
        recentOrders,
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
