import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  locationIds?: string[];
};

const ACTIVE_BOOKING_STATUSES = [
  "pending",
  "paid",
  "settlement",
  "capture",
  "challenge",
];

export async function POST(request: Request) {
  try {
    const { locationIds } = (await request.json()) as RequestBody;

    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const sanitizedLocationIds = [
      ...new Set(
        locationIds
          .map((locationId) =>
            Number.parseInt(String(locationId || "").trim(), 10),
          )
          .filter(
            (locationId) => Number.isInteger(locationId) && locationId > 0,
          ),
      ),
    ];

    if (sanitizedLocationIds.length === 0) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const supabase = await createClient();

    const { data: activeOrders, error: orderError } = await supabase
      .from("orders")
      .select("id")
      .in("payment_status", ACTIVE_BOOKING_STATUSES);

    if (orderError) {
      console.error("Booked ranges orders fetch error:", orderError);
      return NextResponse.json(
        { message: "Gagal mengambil data order booking" },
        { status: 500 },
      );
    }

    const activeOrderIds = (activeOrders ?? [])
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id));

    if (activeOrderIds.length === 0) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("order_items")
      .select("item_id, booking_start, booking_end")
      .eq("item_type", "location")
      .in("item_id", sanitizedLocationIds)
      .in("order_id", activeOrderIds);

    if (error) {
      console.error("Booked ranges fetch error:", error);
      return NextResponse.json(
        { message: "Gagal mengambil data tanggal booking" },
        { status: 500 },
      );
    }

    return NextResponse.json({ rows: data ?? [] }, { status: 200 });
  } catch (error) {
    console.error("Booked ranges API error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil tanggal booking" },
      { status: 500 },
    );
  }
}
