import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type FoodRow = {
  id: number;
  code: string;
};

type SubCategoryRow = {
  id: number;
  short_code: string;
};

const extractSubCategory = (code: string) => {
  const parts = code.split("-");
  return parts.length >= 4 ? parts[3] : null;
};

export async function seedFoodAndBeverageItemSubCategory(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const { data: items, error: itemsError } = await supabase
    .from("food_and_beverage")
    .select("id, code");

  if (itemsError) {
    throw new Error(`Select food_and_beverage failed: ${itemsError.message}`);
  }

  if (!items || items.length === 0) {
    return {
      table: "food_and_beverage_item_sub_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const subCategoryCodes = Array.from(
    new Set(
      items
        .map((row) => extractSubCategory(String(row.code ?? "")))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (subCategoryCodes.length === 0) {
    return {
      table: "food_and_beverage_item_sub_category",
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
    food_and_beverage_id: number;
    item_sub_category_id: number;
  }> = [];

  for (const item of items as FoodRow[]) {
    const subCategoryCode = extractSubCategory(String(item.code ?? ""));
    if (!subCategoryCode) {
      throw new Error(`Invalid food_and_beverage code: ${item.code}`);
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
      food_and_beverage_id: item.id,
      item_sub_category_id: subCategory.id,
    });
  }

  const itemIds = Array.from(
    new Set(desiredPairs.map((row) => row.food_and_beverage_id)),
  );
  const subCategoryIds = Array.from(
    new Set(desiredPairs.map((row) => row.item_sub_category_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("food_and_beverage_item_sub_category")
    .select("food_and_beverage_id, item_sub_category_id")
    .in("food_and_beverage_id", itemIds)
    .in("item_sub_category_id", subCategoryIds);

  if (existingError) {
    throw new Error(
      `Select food_and_beverage_item_sub_category failed: ${existingError.message}`,
    );
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.food_and_beverage_id}-${row.item_sub_category_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) =>
      !existingKey.has(
        `${row.food_and_beverage_id}-${row.item_sub_category_id}`,
      ),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("food_and_beverage_item_sub_category")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert food_and_beverage_item_sub_category failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "food_and_beverage_item_sub_category",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
