import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type CrewRow = {
  id: number;
  code: string;
};

type CategoryRow = {
  id: number;
  short_code: string;
};

function getCategoryShortCode(code: string): string | null {
  const parts = code.split("-");
  return parts.length >= 3 ? parts[2] : null;
}

export async function seedCrewItemCategory(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const { data: crews, error: crewsError } = await supabase
    .from("crews")
    .select("id, code");

  if (crewsError) {
    throw new Error(`Select crews failed: ${crewsError.message}`);
  }

  if (!crews || crews.length === 0) {
    return {
      table: "crew_item_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const categoryCodes = Array.from(
    new Set(
      crews
        .map((row) => getCategoryShortCode(String(row.code ?? "")))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (categoryCodes.length === 0) {
    return {
      table: "crew_item_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const { data: categories, error: categoriesError } = await supabase
    .from("item_categories")
    .select("id, short_code")
    .in("short_code", categoryCodes);

  if (categoriesError) {
    throw new Error(
      `Select item_categories failed: ${categoriesError.message}`,
    );
  }

  const categoryMap = new Map(
    (categories ?? []).map((row) => [row.short_code, row] as const),
  );

  const missingCategoryCodes = categoryCodes.filter(
    (code) => !categoryMap.has(code),
  );

  if (missingCategoryCodes.length > 0) {
    throw new Error(
      `Item categories not found: ${missingCategoryCodes.join(", ")}`,
    );
  }

  const desiredPairs: Array<{ crew_id: number; item_category_id: number }> = [];

  for (const crew of crews as CrewRow[]) {
    const categoryCode = getCategoryShortCode(String(crew.code ?? ""));
    if (!categoryCode) {
      throw new Error(`Invalid crew code: ${crew.code}`);
    }

    const category = categoryMap.get(categoryCode) as CategoryRow | undefined;
    if (!category) {
      throw new Error(`Item category not found for code: ${categoryCode}`);
    }

    desiredPairs.push({
      crew_id: crew.id,
      item_category_id: category.id,
    });
  }

  const crewIds = Array.from(new Set(desiredPairs.map((row) => row.crew_id)));
  const categoryIds = Array.from(
    new Set(desiredPairs.map((row) => row.item_category_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("crew_item_category")
    .select("crew_id, item_category_id")
    .in("crew_id", crewIds)
    .in("item_category_id", categoryIds);

  if (existingError) {
    throw new Error(
      `Select crew_item_category failed: ${existingError.message}`,
    );
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.crew_id}-${row.item_category_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) => !existingKey.has(`${row.crew_id}-${row.item_category_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("crew_item_category")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert crew_item_category failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "crew_item_category",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
