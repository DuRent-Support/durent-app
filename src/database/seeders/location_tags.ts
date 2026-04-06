import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type LocationTagRow = {
  name: string;
};

const locationTagRows: LocationTagRow[] = [
  { name: "Indoor" },
  { name: "Outdoor" },
  { name: "Studio" },
  { name: "Nature" },
  { name: "Urban" },
  { name: "Vintage" },
  { name: "Industrial" },
  { name: "Rooftop" },
  { name: "Minimalist" },
];

export async function seedLocationTags(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (locationTagRows.length === 0) {
    return {
      table: "location_tags",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const names = locationTagRows.map((row) => row.name);
  const { data: existingRows, error: selectError } = await supabase
    .from("location_tags")
    .select("name")
    .in("name", names);

  if (selectError) {
    throw new Error(`Select location_tags failed: ${selectError.message}`);
  }

  const existingNames = new Set(
    (existingRows ?? []).map((row) => String(row.name ?? "")),
  );

  const rowsToInsert = locationTagRows.filter(
    (row) => !existingNames.has(row.name),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("location_tags")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert location_tags failed: ${insertError.message}`);
    }
  }

  return {
    table: "location_tags",
    total: locationTagRows.length,
    inserted: rowsToInsert.length,
    skipped: locationTagRows.length - rowsToInsert.length,
  };
}
