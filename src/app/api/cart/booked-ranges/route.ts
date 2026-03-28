import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type RequestBody = {
  locationIds?: string[];
};

export async function POST(request: Request) {
  try {
    const { locationIds } = (await request.json()) as RequestBody;

    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const sanitizedLocationIds = [
      ...new Set(
        locationIds
          .map((locationId) => String(locationId || "").trim())
          .filter((locationId) => locationId.length > 0),
      ),
    ];

    if (sanitizedLocationIds.length === 0) {
      return NextResponse.json({ rows: [] }, { status: 200 });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("order_items")
      .select("location_id, booking_start, booking_end")
      .in("location_id", sanitizedLocationIds);

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
