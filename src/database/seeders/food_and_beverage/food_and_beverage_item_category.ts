import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "../_shared";

type FoodRow = {
  id: number;
  code: string;
};

type CategoryRow = {
  id: number;
  short_code: string;
};

const extractCategory = (code: string) => {
  const parts = code.split("-");
  return parts.length >= 3 ? parts[2] : null;
};

export async function seedFoodAndBeverageItemCategory(
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
      table: "food_and_beverage_item_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const categoryCodes = Array.from(
    new Set(
      items
        .map((row) => extractCategory(String(row.code ?? "")))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (categoryCodes.length === 0) {
    return {
      table: "food_and_beverage_item_category",
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
    food_and_beverage_id: number;
    item_category_id: number;
  }> = [];

  for (const item of items as FoodRow[]) {
    const categoryCode = extractCategory(String(item.code ?? ""));
    if (!categoryCode) {
      throw new Error(`Invalid food_and_beverage code: ${item.code}`);
    }

    const category = categoryMap.get(categoryCode) as CategoryRow | undefined;
    if (!category) {
      throw new Error(`Item category not found for code: ${categoryCode}`);
    }

    desiredPairs.push({
      food_and_beverage_id: item.id,
      item_category_id: category.id,
    });
  }

  const itemIds = Array.from(
    new Set(desiredPairs.map((row) => row.food_and_beverage_id)),
  );
  const categoryIds = Array.from(
    new Set(desiredPairs.map((row) => row.item_category_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("food_and_beverage_item_category")
    .select("food_and_beverage_id, item_category_id")
    .in("food_and_beverage_id", itemIds)
    .in("item_category_id", categoryIds);

  if (existingError) {
    throw new Error(
      `Select food_and_beverage_item_category failed: ${existingError.message}`,
    );
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.food_and_beverage_id}-${row.item_category_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) =>
      !existingKey.has(`${row.food_and_beverage_id}-${row.item_category_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("food_and_beverage_item_category")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert food_and_beverage_item_category failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "food_and_beverage_item_category",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
