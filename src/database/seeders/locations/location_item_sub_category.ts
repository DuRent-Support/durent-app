import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "../_shared";

type LocationRow = {
  id: number;
  code: string;
};

type SubCategoryRow = {
  id: number;
  short_code: string;
};

function readSubCategoryCode(code: string): string | null {
  const parts = code.split("-");
  return parts.length >= 4 ? parts[3] : null;
}

export async function seedLocationItemSubCategory(
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
      table: "location_item_sub_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const subCategoryCodes = Array.from(
    new Set(
      locations
        .map((row) => readSubCategoryCode(String(row.code ?? "")))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (subCategoryCodes.length === 0) {
    return {
      table: "location_item_sub_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const { data: subCategories, error: subCategoriesError } = await supabase
    .from("item_sub_categories")
    .select("id, short_code")
    .in("short_code", subCategoryCodes);

  if (subCategoriesError) {
    throw new Error(
      `Select item_sub_categories failed: ${subCategoriesError.message}`,
    );
  }

  const subCategoryMap = new Map(
    (subCategories ?? []).map((row) => [row.short_code, row] as const),
  );

  const missingSubCategoryCodes = subCategoryCodes.filter(
    (code) => !subCategoryMap.has(code),
  );

  if (missingSubCategoryCodes.length > 0) {
    throw new Error(
      `Item sub categories not found: ${missingSubCategoryCodes.join(", ")}`,
    );
  }

  const desiredPairs: Array<{
    location_id: number;
    item_sub_category_id: number;
  }> = [];

  for (const location of locations as LocationRow[]) {
    const subCategoryCode = readSubCategoryCode(String(location.code ?? ""));
    if (!subCategoryCode) {
      throw new Error(`Invalid location code: ${location.code}`);
    }

    const subCategory = subCategoryMap.get(subCategoryCode) as
      | SubCategoryRow
      | undefined;
    if (!subCategory) {
      throw new Error(
        `Item sub category not found for code: ${subCategoryCode}`,
      );
    }

    desiredPairs.push({
      location_id: location.id,
      item_sub_category_id: subCategory.id,
    });
  }

  const locationIds = Array.from(
    new Set(desiredPairs.map((row) => row.location_id)),
  );
  const subCategoryIds = Array.from(
    new Set(desiredPairs.map((row) => row.item_sub_category_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("location_item_sub_category")
    .select("location_id, item_sub_category_id")
    .in("location_id", locationIds)
    .in("item_sub_category_id", subCategoryIds);

  if (existingError) {
    throw new Error(
      `Select location_item_sub_category failed: ${existingError.message}`,
    );
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.location_id}-${row.item_sub_category_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) =>
      !existingKey.has(`${row.location_id}-${row.item_sub_category_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("location_item_sub_category")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert location_item_sub_category failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "location_item_sub_category",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
