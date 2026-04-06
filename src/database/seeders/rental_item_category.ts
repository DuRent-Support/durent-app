import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type RentalRow = {
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

export async function seedRentalItemCategory(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const { data: rentals, error: rentalsError } = await supabase
    .from("rentals")
    .select("id, code");

  if (rentalsError) {
    throw new Error(`Select rentals failed: ${rentalsError.message}`);
  }

  if (!rentals || rentals.length === 0) {
    return {
      table: "rental_item_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const categoryCodes = Array.from(
    new Set(
      rentals
        .map((row) => readCategoryCode(String(row.code ?? "")))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (categoryCodes.length === 0) {
    return {
      table: "rental_item_category",
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

  const desiredPairs: Array<{ rental_id: number; item_category_id: number }> =
    [];

  for (const rental of rentals as RentalRow[]) {
    const categoryCode = readCategoryCode(String(rental.code ?? ""));
    if (!categoryCode) {
      throw new Error(`Invalid rental code: ${rental.code}`);
    }

    const category = categoryMap.get(categoryCode) as CategoryRow | undefined;
    if (!category) {
      throw new Error(`Item category not found for code: ${categoryCode}`);
    }

    desiredPairs.push({
      rental_id: rental.id,
      item_category_id: category.id,
    });
  }

  const rentalIds = Array.from(
    new Set(desiredPairs.map((row) => row.rental_id)),
  );
  const categoryIds = Array.from(
    new Set(desiredPairs.map((row) => row.item_category_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("rental_item_category")
    .select("rental_id, item_category_id")
    .in("rental_id", rentalIds)
    .in("item_category_id", categoryIds);

  if (existingError) {
    throw new Error(
      `Select rental_item_category failed: ${existingError.message}`,
    );
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.rental_id}-${row.item_category_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) => !existingKey.has(`${row.rental_id}-${row.item_category_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("rental_item_category")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert rental_item_category failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "rental_item_category",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
