import { NextResponse } from "next/server";

import { listRentalsWithRelations } from "../admin/rentals/_shared";

export async function GET() {
  try {
    const records = await listRentalsWithRelations();
    const rentals = records.filter((item) => Boolean(item.is_available));

    return NextResponse.json({ rentals }, { status: 200 });
  } catch (error) {
    console.error("Get rentals error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data rentals." },
      { status: 500 },
    );
  }
}
