import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type PaymentStatus =
  | "paid"
  | "unpaid"
  | "refunded"
  | "partial"
  | "pending"
  | "challenge"
  | "failed";

type OrderRow = {
  order_id: string;
  user_id: string;
  payment_status: string | null;
  total_price: string | number | null;
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
  shooting_location_image_url: string[] | null;
};

type BookingPlace = {
  locationTitle: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  days: number;
  pricePerDay: number;
  subtotal: number;
};

type BookingOrder = {
  orderId: string;
  customerName: string;
  paymentStatus: PaymentStatus;
  places: BookingPlace[];
  totalPrice: number;
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

function normalizePaymentStatus(
  value: string | null | undefined,
): PaymentStatus {
  const status = String(value || "")
    .trim()
    .toLowerCase();

  if (status === "paid" || status === "settlement") return "paid";
  if (status === "partial") return "partial";
  if (status === "refunded") return "refunded";
  if (status === "challenge") return "challenge";
  if (status === "cancel" || status === "deny" || status === "expire") {
    return "failed";
  }
  if (status === "unpaid") return "unpaid";
  return "pending";
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

    const { data: orderRows, error: orderError } = await serviceRoleClient
      .from("orders")
      .select("order_id, user_id, payment_status, total_price, created_at")
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error("Fetch orders error:", orderError);
      return NextResponse.json(
        { message: "Gagal mengambil data orders." },
        { status: 500 },
      );
    }

    const fetchedOrders = (orderRows ?? []) as OrderRow[];

    if (fetchedOrders.length === 0) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    const orderIds = fetchedOrders.map((order) => order.order_id);

    const { data: orderItemRows, error: orderItemsError } =
      await serviceRoleClient
        .from("order_items")
        .select(
          "order_id, location_id, booking_start, booking_end, price, quantity",
        )
        .in("order_id", orderIds)
        .order("booking_start", { ascending: true });

    if (orderItemsError) {
      console.error("Fetch order_items error:", orderItemsError);
      return NextResponse.json(
        { message: "Gagal mengambil data order items." },
        { status: 500 },
      );
    }

    const fetchedOrderItems = (orderItemRows ?? []) as OrderItemRow[];
    const userIds = [...new Set(fetchedOrders.map((order) => order.user_id))];
    const locationIds = [
      ...new Set(fetchedOrderItems.map((item) => item.location_id)),
    ];

    let locationMap = new Map<string, LocationRow>();
    let authUserMap = new Map<
      string,
      { fullName: string | null; email: string | null }
    >();

    if (userIds.length > 0) {
      const users = await Promise.all(
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

      authUserMap = new Map(
        users.map((authUser) => [
          authUser.user_id,
          {
            fullName: authUser.full_name,
            email: authUser.email,
          },
        ]),
      );
    }

    if (locationIds.length > 0) {
      const { data: locationRows, error: locationError } =
        await serviceRoleClient
          .from("shooting_locations")
          .select(
            "shooting_location_id, shooting_location_name, shooting_location_image_url",
          )
          .in("shooting_location_id", locationIds);

      if (locationError) {
        console.error("Fetch shooting_locations error:", locationError);
      } else {
        const locations = (locationRows ?? []) as LocationRow[];
        locationMap = new Map(
          locations.map((location) => [
            location.shooting_location_id,
            location,
          ]),
        );
      }
    }

    const itemsByOrder = new Map<string, OrderItemRow[]>();

    for (const item of fetchedOrderItems) {
      const bucket = itemsByOrder.get(item.order_id) ?? [];
      bucket.push(item);
      itemsByOrder.set(item.order_id, bucket);
    }

    const mappedOrders: BookingOrder[] = fetchedOrders.map((order) => {
      const itemRows = itemsByOrder.get(order.order_id) ?? [];

      const places = itemRows.map((item) => {
        const location = locationMap.get(item.location_id);
        const days = Math.max(1, Number(item.quantity ?? 1));
        const pricePerDay = parseNumber(item.price);

        return {
          locationTitle:
            location?.shooting_location_name || `Lokasi ${item.location_id}`,
          imageUrl:
            location?.shooting_location_image_url?.[1] ||
            location?.shooting_location_image_url?.[0] ||
            "/placeholder_durent.webp",
          startDate: item.booking_start,
          endDate: item.booking_end,
          days,
          pricePerDay,
          subtotal: days * pricePerDay,
        };
      });

      const calculatedTotal = places.reduce(
        (acc, place) => acc + place.subtotal,
        0,
      );
      const totalPrice = parseNumber(order.total_price) || calculatedTotal;
      const authUser = authUserMap.get(order.user_id);
      const customerName =
        authUser?.fullName || authUser?.email || order.user_id;

      return {
        orderId: order.order_id,
        customerName,
        paymentStatus: normalizePaymentStatus(order.payment_status),
        places,
        totalPrice,
      };
    });

    return NextResponse.json({ orders: mappedOrders }, { status: 200 });
  } catch (error) {
    console.error("Get admin bookings error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data booking." },
      { status: 500 },
    );
  }
}
