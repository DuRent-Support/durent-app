import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type LocationRow = {
  id: number;
  code: string;
};

type TagRow = {
  id: number;
  name: string;
};

export async function seedLocationTagPivot(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const { data: locations, error: locationsError } = await supabase
    .from("locations")
    .select("id, code");

  if (locationsError) {
    throw new Error(`Select locations failed: ${locationsError.message}`);
  }

  const { data: tags, error: tagsError } = await supabase
    .from("location_tags")
    .select("id, name");

  if (tagsError) {
    throw new Error(`Select location_tags failed: ${tagsError.message}`);
  }

  if (!locations || locations.length === 0 || !tags || tags.length === 0) {
    return {
      table: "location_tag",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const desiredPairs: Array<{ location_id: number; location_tag_id: number }> =
    [];

  locations.forEach((location, index) => {
    const firstTag = tags[index % tags.length] as TagRow;
    const secondTag = tags[(index + 2) % tags.length] as TagRow;
    const thirdTag = tags[(index + 4) % tags.length] as TagRow;
    const tagIds = new Set([firstTag.id, secondTag.id]);

    if (index % 2 === 0 && tags.length > 2) {
      tagIds.add(thirdTag.id);
    }

    for (const tagId of tagIds) {
      desiredPairs.push({
        location_id: (location as LocationRow).id,
        location_tag_id: tagId,
      });
    }
  });

  const locationIds = Array.from(
    new Set(desiredPairs.map((pair) => pair.location_id)),
  );
  const tagIds = Array.from(
    new Set(desiredPairs.map((pair) => pair.location_tag_id)),
  );

  const { data: existingPairs, error: existingError } = await supabase
    .from("location_tag")
    .select("location_id, location_tag_id")
    .in("location_id", locationIds)
    .in("location_tag_id", tagIds);

  if (existingError) {
    throw new Error(`Select location_tag failed: ${existingError.message}`);
  }

  const existingKey = new Set(
    (existingPairs ?? []).map(
      (row) => `${row.location_id}-${row.location_tag_id}`,
    ),
  );

  const rowsToInsert = desiredPairs.filter(
    (pair) => !existingKey.has(`${pair.location_id}-${pair.location_tag_id}`),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("location_tag")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert location_tag failed: ${insertError.message}`);
    }
  }

  return {
    table: "location_tag",
    total: desiredPairs.length,
    inserted: rowsToInsert.length,
    skipped: desiredPairs.length - rowsToInsert.length,
  };
}
