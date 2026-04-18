import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "../_shared";

type BundleRow = {
  id: number;
  code: string;
};

type BundleTypeRow = {
  id: number;
  short_code: string;
};

function getBundleTypeCode(code: string): string | null {
  const parts = code.split("-");
  return parts.length >= 2 ? parts[1] : null;
}

export async function seedBundleTypePivot(
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
      table: "bundle_type",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const typeCodes = Array.from(
    new Set(
      bundles
        .map((row) => getBundleTypeCode(String(row.code ?? "")))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (typeCodes.length === 0) {
    return {
      table: "bundle_type",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const { data: bundleTypes, error: typesError } = await supabase
    .from("bundle_types")
    .select("id, short_code")
    .in("short_code", typeCodes);

  if (typesError) {
    throw new Error(`Select bundle_types failed: ${typesError.message}`);
  }

  const typeMap = new Map(
    (bundleTypes ?? []).map((row) => [
      String(row.short_code ?? ""),
      Number(row.id),
    ]),
  );

  const desiredPairs: Array<{ bundle_id: number; bundle_type_id: number }> = [];

  for (const bundle of bundles as BundleRow[]) {
    const typeCode = getBundleTypeCode(String(bundle.code ?? ""));
    if (!typeCode) continue;

    const typeId = typeMap.get(typeCode);
    if (!typeId) {
      console.warn(
        `[seedBundleTypePivot] bundle_type not found for code: ${typeCode}`,
      );
      continue;
    }

    desiredPairs.push({ bundle_id: bundle.id, bundle_type_id: typeId });
  }

  if (desiredPairs.length === 0) {
    return {
      table: "bundle_type",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const bundleIds = Array.from(
    new Set(desiredPairs.map((row) => row.bundle_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("bundle_type")
    .select("bundle_id, bundle_type_id")
    .in("bundle_id", bundleIds);

  if (existingError) {
    throw new Error(`Select bundle_type failed: ${existingError.message}`);
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.bundle_id}-${row.bundle_type_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (row) => !existingKey.has(`${row.bundle_id}-${row.bundle_type_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("bundle_type")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert bundle_type failed: ${insertError.message}`);
    }
  }

  return {
    table: "bundle_type",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
