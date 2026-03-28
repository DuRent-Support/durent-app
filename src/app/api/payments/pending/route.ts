import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type PendingOrderRow = {
  order_id: string;
  total_price: string | number | null;
  payment_status: string | null;
  created_at: string | null;
  midtrans_token: string | null;
  midtrans_expire_at: string | null;
};

type PendingOrderItemRow = {
  order_id: string;
  location_id: string;
  booking_start: string;
  booking_end: string;
  quantity: number | null;
  price: string | number | null;
};

type LocationRow = {
  shooting_location_id: string;
  shooting_location_name: string;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        "order_id, total_price, payment_status, created_at, midtrans_token, midtrans_expire_at",
      )
      .eq("user_id", user.id)
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch pending payments error:", error);
      return NextResponse.json(
        { message: "Gagal mengambil data pembayaran pending" },
        { status: 500 },
      );
    }

    const baseRows = (data ?? []) as PendingOrderRow[];
    const pendingRows = baseRows.filter((row) => Boolean(row.midtrans_token));

    if (pendingRows.length === 0) {
      return NextResponse.json({ pendingPayments: [] }, { status: 200 });
    }

    const orderIds = pendingRows.map((row) => row.order_id);
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select("order_id, location_id, booking_start, booking_end, quantity, price")
      .in("order_id", orderIds);

    if (orderItemsError) {
      console.error("Fetch order items error:", orderItemsError);
      return NextResponse.json(
        {
          pendingPayments: pendingRows.map((row) => ({ ...row, items: [] })),
        },
        { status: 200 },
      );
    }

    const orderItems = (orderItemsData ?? []) as PendingOrderItemRow[];
    const locationIds = [...new Set(orderItems.map((item) => item.location_id))];

    let locationMap = new Map<string, string>();

    if (locationIds.length > 0) {
      const { data: locationsData, error: locationsError } = await supabase
        .from("shooting_locations")
        .select("shooting_location_id, shooting_location_name")
        .in("shooting_location_id", locationIds);

      if (locationsError) {
        console.error("Fetch locations error:", locationsError);
      } else {
        const locations = (locationsData ?? []) as LocationRow[];
        locationMap = new Map(
          locations.map((location) => [
            location.shooting_location_id,
            location.shooting_location_name,
          ]),
        );
      }
    }

    const enrichedRows = pendingRows.map((row) => ({
      ...row,
      items: orderItems
        .filter((item) => item.order_id === row.order_id)
        .map((item) => ({
          ...item,
          location_name:
            locationMap.get(item.location_id) ?? "Lokasi tidak ditemukan",
        })),
    }));

    return NextResponse.json({ pendingPayments: enrichedRows }, { status: 200 });
  } catch (error) {
    console.error("Pending payments API error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil pembayaran pending" },
      { status: 500 },
    );
  }
}
