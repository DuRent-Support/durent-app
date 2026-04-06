import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type CrewRow = {
  id: number;
  name: string;
};

type SkillRow = {
  id: number;
  name: string;
};

function pickPrimarySkill(
  crewName: string,
  skillByName: Map<string, SkillRow>,
  fallbackSkillIds: number[],
  index: number,
): number {
  const normalized = crewName.toLowerCase();
  if (normalized.includes("unit production manager")) {
    return (
      skillByName.get("Unit Production Manager")?.id ?? fallbackSkillIds[0]
    );
  }
  if (normalized.includes("production unit")) {
    return skillByName.get("Production Unit")?.id ?? fallbackSkillIds[0];
  }
  if (normalized.includes("runner")) {
    return skillByName.get("Runner")?.id ?? fallbackSkillIds[0];
  }
  return fallbackSkillIds[index % fallbackSkillIds.length];
}

export async function seedCrewSkillPivot(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const { data: crews, error: crewsError } = await supabase
    .from("crews")
    .select("id, name");

  if (crewsError) {
    throw new Error(`Select crews failed: ${crewsError.message}`);
  }

  const { data: skills, error: skillsError } = await supabase
    .from("crew_skills")
    .select("id, name");

  if (skillsError) {
    throw new Error(`Select crew_skills failed: ${skillsError.message}`);
  }

  if (!crews || crews.length === 0 || !skills || skills.length === 0) {
    return {
      table: "crew_skill",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const skillByName = new Map(skills.map((row) => [row.name, row] as const));
  const skillIds = skills.map((row) => row.id);

  const desiredPairs: Array<{ crew_id: number; crew_skill_id: number }> = [];

  crews.forEach((crew, index) => {
    const primarySkillId = pickPrimarySkill(
      String(crew.name ?? ""),
      skillByName,
      skillIds,
      index,
    );

    const secondarySkillId =
      skillIds[(index + 2) % skillIds.length] ?? primarySkillId;

    const selectedSkillIds = new Set([primarySkillId, secondarySkillId]);

    for (const skillId of selectedSkillIds) {
      desiredPairs.push({
        crew_id: crew.id,
        crew_skill_id: skillId,
      });
    }
  });

  const crewIds = Array.from(new Set(desiredPairs.map((row) => row.crew_id)));
  const skillIdList = Array.from(
    new Set(desiredPairs.map((row) => row.crew_skill_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("crew_skill")
    .select("crew_id, crew_skill_id")
    .in("crew_id", crewIds)
    .in("crew_skill_id", skillIdList);

  if (existingError) {
    throw new Error(`Select crew_skill failed: ${existingError.message}`);
  }

  const existingKey = new Set(
    (existingPairs ?? []).map((row) => `${row.crew_id}-${row.crew_skill_id}`),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) => !existingKey.has(`${row.crew_id}-${row.crew_skill_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("crew_skill")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert crew_skill failed: ${insertError.message}`);
    }
  }

  return {
    table: "crew_skill",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
