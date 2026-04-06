import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type CrewSkillRow = {
  name: string;
  description: string | null;
};

const crewSkillRows: CrewSkillRow[] = [
  {
    name: "Unit Production Manager",
    description: "Kemampuan mengelola produksi dan koordinasi kru.",
  },
  {
    name: "Production Unit",
    description: "Kemampuan mendukung operasional unit produksi di lapangan.",
  },
  {
    name: "Runner",
    description: "Kemampuan membantu kebutuhan logistik dan operasional kru.",
  },
  {
    name: "Akting",
    description: "Kemampuan akting di depan kamera.",
  },
  {
    name: "Public Speaking",
    description: "Kemampuan berbicara percaya diri di depan umum.",
  },
  {
    name: "Editing",
    description: "Kemampuan mengolah video menjadi hasil akhir.",
  },
  {
    name: "Color Grading",
    description: "Kemampuan koreksi warna dan grading video.",
  },
  {
    name: "Makeup Artist",
    description: "Kemampuan menerapkan makeup untuk keperluan produksi video.",
  },
];

export async function seedCrewSkills(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (crewSkillRows.length === 0) {
    return {
      table: "crew_skills",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const names = crewSkillRows.map((row) => row.name);
  const { data: existingRows, error: selectError } = await supabase
    .from("crew_skills")
    .select("name")
    .in("name", names);

  if (selectError) {
    throw new Error(`Select crew_skills failed: ${selectError.message}`);
  }

  const existingNames = new Set(
    (existingRows ?? []).map((row) => String(row.name ?? "")),
  );

  const rowsToInsert = crewSkillRows.filter(
    (row) => !existingNames.has(row.name),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("crew_skills")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert crew_skills failed: ${insertError.message}`);
    }
  }

  return {
    table: "crew_skills",
    total: crewSkillRows.length,
    inserted: rowsToInsert.length,
    skipped: crewSkillRows.length - rowsToInsert.length,
  };
}
