import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Crew } from "@/types";

type CrewRow = {
  crew_id?: string;
  id?: string;
  name?: string;
  description?: string;
  images?: string[] | null;
  price?: number | string | null;
  skills?: Crew["skills"];
  created_at?: string;
};

function mapCrewRow(row: CrewRow, skills: string[] = []): Crew {
  return {
    crew_id: row.crew_id ?? row.id ?? "",
    name: row.name ?? "",
    description: row.description ?? "",
    images: Array.isArray(row.images)
      ? row.images.filter((img): img is string => typeof img === "string")
      : [],
    price:
      typeof row.price === "number"
        ? row.price
        : Number.parseInt(String(row.price ?? 0), 10) || 0,
    skills: skills.length > 0 ? skills : (row.skills ?? []),
    created_at: row.created_at,
  };
}

export async function GET() {
  try {
    const supabase = await createClient();

    const orderedResult = await supabase
      .from("crews")
      .select("*")
      .order("created_at", { ascending: false });

    let rows = orderedResult.data as CrewRow[] | null;

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

      const fallbackResult = await supabase.from("crews").select("*");

      if (fallbackResult.error) {
        return NextResponse.json(
          { message: fallbackResult.error.message },
          { status: 400 },
        );
      }

      rows = fallbackResult.data as CrewRow[] | null;
    }

    const crews = (rows ?? []).map((row) => mapCrewRow(row, []));

    return NextResponse.json({ crews }, { status: 200 });
  } catch (error) {
    console.error("Get crews error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data crews." },
      { status: 500 },
    );
  }
}
