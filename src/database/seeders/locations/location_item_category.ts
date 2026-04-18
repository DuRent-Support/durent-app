import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "../_shared";

type LocationRow = {
  id: number;
  code: string;
};

type CategoryRow = {
  id: number;
  short_code: string;
};

function readCategoryCode(code: string): string | null {
  const parts = code.split("-");
  return parts.length >= 3 ? parts[2] : null;
}

export async function seedLocationItemCategory(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id, code");

  if (locationsError) {
    throw new Error(`Select locations failed: ${locationsError.message}`);
  }

  if (!locations || locations.length === 0) {
    return {
      table: "location_item_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const categoryCodes = Array.from(
    new Set(
      locations
        .map((row) => readCategoryCode(String(row.code ?? "")))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (categoryCodes.length === 0) {
    return {
      table: "location_item_category",
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

  const desiredPairs: Array<{
    location_id: number;
    item_category_id: number;
  }> = [];

  for (const location of locations as LocationRow[]) {
    const categoryCode = readCategoryCode(String(location.code ?? ""));
    if (!categoryCode) {
      throw new Error(`Invalid location code: ${location.code}`);
    }

    const category = categoryMap.get(categoryCode) as CategoryRow | undefined;
    if (!category) {
      throw new Error(`Item category not found for code: ${categoryCode}`);
    }

    desiredPairs.push({
      location_id: location.id,
      item_category_id: category.id,
    });
  }

  const locationIds = Array.from(
    new Set(desiredPairs.map((row) => row.location_id)),
  );
  const categoryIds = Array.from(
    new Set(desiredPairs.map((row) => row.item_category_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("location_item_category")
    .select("location_id, item_category_id")
    .in("location_id", locationIds)
    .in("item_category_id", categoryIds);

  if (existingError) {
    throw new Error(
      `Select location_item_category failed: ${existingError.message}`,
    );
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.location_id}-${row.item_category_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) => !existingKey.has(`${row.location_id}-${row.item_category_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("location_item_category")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert location_item_category failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "location_item_category",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
