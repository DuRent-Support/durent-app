import { NextResponse } from "next/server";

import type { FoodAndBeverage } from "@/types";

import { listFoodAndBeverageWithRelations } from "../admin/food-and-beverage/_shared";

export async function GET() {
  try {
    const records =
      (await listFoodAndBeverageWithRelations()) as FoodAndBeverage[];

    const items = records.filter((item) => Boolean(item.is_available));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Get food & beverage error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data food & beverage." },
      { status: 500 },
    );
  }
}
