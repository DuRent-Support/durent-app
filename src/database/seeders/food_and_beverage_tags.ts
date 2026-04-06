import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type FoodAndBeverageTagRow = {
  name: string;
};

const foodAndBeverageTagRows: FoodAndBeverageTagRow[] = [
  { name: "Snack" },
  { name: "Beverage" },
  { name: "Coffee" },
  { name: "Tea" },
  { name: "Mineral Water" },
  { name: "Catering" },
  { name: "Lunch Box" },
  { name: "Dessert" },
  { name: "Healthy" },
];

export async function seedFoodAndBeverageTags(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (foodAndBeverageTagRows.length === 0) {
    return {
      table: "food_and_beverage_tags",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const names = foodAndBeverageTagRows.map((row) => row.name);
  const { data: existingRows, error: selectError } = await supabase
    .from("food_and_beverage_tags")
    .select("name")
    .in("name", names);

  if (selectError) {
    throw new Error(
      `Select food_and_beverage_tags failed: ${selectError.message}`,
    );
  }

  const existingNames = new Set(
    (existingRows ?? []).map((row) => String(row.name ?? "")),
  );

  const rowsToInsert = foodAndBeverageTagRows.filter(
    (row) => !existingNames.has(row.name),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("food_and_beverage_tags")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert food_and_beverage_tags failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "food_and_beverage_tags",
    total: foodAndBeverageTagRows.length,
    inserted: rowsToInsert.length,
    skipped: foodAndBeverageTagRows.length - rowsToInsert.length,
  };
}
