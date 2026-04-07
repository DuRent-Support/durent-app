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

    const crewIds = (rows ?? [])
      .map((row) => Number(row.crew_id ?? row.id))
      .filter((id) => Number.isFinite(id));

    console.log("[crews] rows:", (rows ?? []).length);
    console.log("[crews] crewIds:", crewIds);

    const skillsMap = new Map<number, string[]>();
    if (crewIds.length > 0) {
      const pivotResult = await supabase
        .from("crew_skill")
        .select("crew_id, crew_skill_id")
        .in("crew_id", crewIds);

      if (pivotResult.error) {
        console.log("[crews] crew_skill error:", pivotResult.error);
      } else {
        const pivotRows = pivotResult.data ?? [];
        console.log("[crews] crew_skill rows:", pivotRows.length);

        const skillIds = Array.from(
          new Set(
            pivotRows
              .map((row) => Number(row.crew_skill_id))
              .filter((id) => Number.isFinite(id)),
          ),
        );

        const skillsResult = skillIds.length
          ? await supabase
              .from("crew_skills")
              .select("id, name")
              .in("id", skillIds)
          : { data: [], error: null };

        if (skillsResult.error) {
          console.log("[crews] crew_skills error:", skillsResult.error);
        } else {
          const nameById = new Map<number, string>();
          (skillsResult.data ?? []).forEach((row) => {
            const id = Number(row.id);
            const name = String(row.name ?? "").trim();
            if (Number.isFinite(id) && name) {
              nameById.set(id, name);
            }
          });

          pivotRows.forEach((row) => {
            const crewId = Number(row.crew_id);
            const skillId = Number(row.crew_skill_id);
            if (!Number.isFinite(crewId) || !Number.isFinite(skillId)) return;
            const name = nameById.get(skillId);
            if (!name) return;
            const existing = skillsMap.get(crewId) ?? [];
            existing.push(name);
            skillsMap.set(crewId, existing);
          });
        }
      }
    }

    const crews = (rows ?? []).map((row) => {
      const crewId = Number(row.crew_id ?? row.id);
      const skills = Number.isFinite(crewId)
        ? (skillsMap.get(crewId) ?? [])
        : [];
      return mapCrewRow(row, skills);
    });

    console.log(
      "[crews] sample skills:",
      crews.slice(0, 3).map((crew) => ({
        crew_id: crew.crew_id,
        skills: crew.skills,
      })),
    );

    return NextResponse.json({ crews }, { status: 200 });
  } catch (error) {
    console.error("Get crews error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data crews." },
      { status: 500 },
    );
  }
}
