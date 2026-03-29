import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Equipment } from "@/types";

type EquipmentRow = {
  equipment_id?: string;
  id?: string;
  name?: string;
  description?: string;
  price?: number | string | null;
  specs?: Equipment["specs"];
  images?: string[] | null;
  created_at?: string;
};

function mapEquipmentRow(row: EquipmentRow): Equipment {
  return {
    equipment_id: row.equipment_id ?? row.id ?? "",
    name: row.name ?? "",
    description: row.description ?? "",
    price:
      typeof row.price === "number"
        ? row.price
        : Number.parseInt(String(row.price ?? 0), 10) || 0,
    specs:
      row.specs && typeof row.specs === "object"
        ? row.specs
        : ({} as Equipment["specs"]),
    images: Array.isArray(row.images)
      ? row.images.filter((img): img is string => typeof img === "string")
      : [],
    created_at: row.created_at,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const orderedResult = await supabase
      .from("equipments")
      .select("*")
      .order("created_at", { ascending: false });

    let rows = orderedResult.data as EquipmentRow[] | null;

    if (orderedResult.error) {
      const message = String(orderedResult.error.message || "").toLowerCase();
      const createdAtMissing =
        message.includes('column "created_at"') &&
        message.includes("does not exist");

      if (!createdAtMissing) {
        return NextResponse.json(
          { message: orderedResult.error.message },
          { status: 400 },
        );
      }

      const fallbackResult = await supabase.from("equipments").select("*");

      if (fallbackResult.error) {
        return NextResponse.json(
          { message: fallbackResult.error.message },
          { status: 400 },
        );
      }

      rows = fallbackResult.data as EquipmentRow[] | null;
    }

    return NextResponse.json(
      { equipments: (rows ?? []).map((row) => mapEquipmentRow(row)) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get equipments error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data equipments." },
      { status: 500 },
    );
  }
}
