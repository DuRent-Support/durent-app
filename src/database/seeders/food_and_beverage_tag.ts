import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type FoodRow = {
  id: number;
  code: string;
  name: string;
};

type TagRow = {
  id: number;
  name: string;
};

const subCategoryToTagName: Record<string, string> = {
  SN: "Snack",
  BV: "Beverage",
  PC: "Catering",
};

const readSubCategoryCode = (code: string) => {
  const parts = code.split("-");
  return parts.length >= 4 ? parts[3] : "";
};

export async function seedFoodAndBeverageTagPivot(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const { data: items, error: itemsError } = await supabase
    .from("food_and_beverage")
    .select("id, code, name");

  if (itemsError) {
    throw new Error(`Select food_and_beverage failed: ${itemsError.message}`);
  }

  const { data: tags, error: tagsError } = await supabase
    .from("food_and_beverage_tags")
    .select("id, name");

  if (tagsError) {
    throw new Error(
      `Select food_and_beverage_tags failed: ${tagsError.message}`,
    );
  }

  if (!items || items.length === 0 || !tags || tags.length === 0) {
    return {
      table: "food_and_beverage_tag",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const tagByName = new Map(tags.map((row) => [row.name, row] as const));

  const desiredPairs: Array<{
    food_and_beverage_id: number;
    food_and_beverage_tag_id: number;
  }> = [];

  items.forEach((item, index) => {
    const subCategoryCode = readSubCategoryCode(String(item.code ?? ""));
    const primaryTagName = subCategoryToTagName[subCategoryCode] ?? "Snack";
    const primaryTag = tagByName.get(primaryTagName) as TagRow | undefined;
    if (!primaryTag) {
      throw new Error(`Food tag not found: ${primaryTagName}`);
    }

    const secondaryTag = tags[(index + 2) % tags.length] as TagRow;
    const tagIds = new Set([primaryTag.id, secondaryTag.id]);

    for (const tagId of tagIds) {
      desiredPairs.push({
        food_and_beverage_id: item.id,
        food_and_beverage_tag_id: tagId,
      });
    }
  });

  const itemIds = Array.from(
    new Set(desiredPairs.map((row) => row.food_and_beverage_id)),
  );
  const tagIds = Array.from(
    new Set(desiredPairs.map((row) => row.food_and_beverage_tag_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("food_and_beverage_tag")
    .select("food_and_beverage_id, food_and_beverage_tag_id")
    .in("food_and_beverage_id", itemIds)
    .in("food_and_beverage_tag_id", tagIds);

  if (existingError) {
    throw new Error(
      `Select food_and_beverage_tag failed: ${existingError.message}`,
    );
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.food_and_beverage_id}-${row.food_and_beverage_tag_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) =>
      !existingKey.has(
        `${row.food_and_beverage_id}-${row.food_and_beverage_tag_id}`,
      ),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("food_and_beverage_tag")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert food_and_beverage_tag failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "food_and_beverage_tag",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
