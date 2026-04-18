import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "../_shared";

type BundleRow = {
  id: number;
  code: string;
};

type BundleCategoryRow = {
  id: number;
  short_code: string;
};

function getBundleCategoryCode(code: string): string | null {
  const parts = code.split("-");
  return parts.length >= 3 ? parts[2] : null;
}

export async function seedBundleCategoryPivot(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const { data: bundles, error: bundlesError } = await supabase
    .from("bundles")
    .select("id, code");

  if (bundlesError) {
    throw new Error(`Select bundles failed: ${bundlesError.message}`);
  }

  if (!bundles || bundles.length === 0) {
    return {
      table: "bundle_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const categoryCodes = Array.from(
    new Set(
      bundles
        .map((row) => getBundleCategoryCode(String(row.code ?? "")))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (categoryCodes.length === 0) {
    return {
      table: "bundle_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const { data: bundleCategories, error: categoriesError } = await supabase
    .from("bundle_categories")
    .select("id, short_code")
    .in("short_code", categoryCodes);

  if (categoriesError) {
    throw new Error(
      `Select bundle_categories failed: ${categoriesError.message}`,
    );
  }

  const categoryMap = new Map(
    (bundleCategories ?? []).map((row) => [
      String(row.short_code ?? ""),
      Number(row.id),
    ]),
  );

  const desiredPairs: Array<{
    bundle_id: number;
    bundle_category_id: number;
  }> = [];

  for (const bundle of bundles as BundleRow[]) {
    const categoryCode = getBundleCategoryCode(String(bundle.code ?? ""));
    if (!categoryCode) continue;

    const categoryId = categoryMap.get(categoryCode);
    if (!categoryId) {
      console.warn(
        `[seedBundleCategoryPivot] bundle_category not found for code: ${categoryCode}`,
      );
      continue;
    }

    desiredPairs.push({ bundle_id: bundle.id, bundle_category_id: categoryId });
  }

  if (desiredPairs.length === 0) {
    return {
      table: "bundle_category",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const bundleIds = Array.from(
    new Set(desiredPairs.map((row) => row.bundle_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("bundle_category")
    .select("bundle_id, bundle_category_id")
    .in("bundle_id", bundleIds);

  if (existingError) {
    throw new Error(`Select bundle_category failed: ${existingError.message}`);
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.bundle_id}-${row.bundle_category_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) => !existingKey.has(`${row.bundle_id}-${row.bundle_category_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("bundle_category")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert bundle_category failed: ${insertError.message}`);
    }
  }

  return {
    table: "bundle_category",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
