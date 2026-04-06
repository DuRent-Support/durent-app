import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type CounterRow = {
  prefix_code: string;
  last_number: number;
};

type CodeRow = {
  code: string | null;
};

function parseCodeCounter(code: string) {
  const parts = code.split("-");
  if (parts.length < 2) {
    return null;
  }

  const suffix = parts[parts.length - 1];
  if (!/^[0-9]+$/.test(suffix)) {
    return null;
  }

  const lastNumber = Number(suffix);
  const prefixCode = parts.slice(0, -1).join("-");

  if (!prefixCode) {
    return null;
  }

  return { prefixCode, lastNumber };
}

export async function seedCodeCounter(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  const [
    locationsResult,
    crewsResult,
    rentalsResult,
    foodResult,
    expendableResult,
    bundlesResult,
  ] = await Promise.all([
    supabase.from("locations").select("code"),
    supabase.from("crews").select("code"),
    supabase.from("rentals").select("code"),
    supabase.from("food_and_beverage").select("code"),
    supabase.from("expendables").select("code"),
    supabase.from("bundles").select("code"),
  ]);

  const sourceErrors =
    locationsResult.error ||
    crewsResult.error ||
    rentalsResult.error ||
    foodResult.error ||
    expendableResult.error ||
    bundlesResult.error;

  if (sourceErrors) {
    throw new Error(sourceErrors.message);
  }

  const allCodes = [
    ...(locationsResult.data ?? []),
    ...(crewsResult.data ?? []),
    ...(rentalsResult.data ?? []),
    ...(foodResult.data ?? []),
    ...(expendableResult.data ?? []),
    ...(bundlesResult.data ?? []),
  ] as CodeRow[];

  const prefixMap = new Map<string, number>();

  for (const row of allCodes) {
    const code = String(row.code ?? "").trim();
    if (!code) {
      continue;
    }

    const parsed = parseCodeCounter(code);
    if (!parsed) {
      continue;
    }

    const current = prefixMap.get(parsed.prefixCode) ?? 0;
    if (parsed.lastNumber > current) {
      prefixMap.set(parsed.prefixCode, parsed.lastNumber);
    }
  }

  if (prefixMap.size === 0) {
    return {
      table: "code_counter",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const prefixes = Array.from(prefixMap.keys());
  const { data: existingRows, error: existingError } = await supabase
    .from("code_counter")
    .select("prefix_code, last_number")
    .in("prefix_code", prefixes);

  if (existingError) {
    throw new Error(`Select code_counter failed: ${existingError.message}`);
  }

  const existingMap = new Map(
    (existingRows ?? []).map((row) => [row.prefix_code, row] as const),
  );

  const rowsToInsert: CounterRow[] = [];
  const rowsToUpdate: CounterRow[] = [];

  for (const [prefixCode, lastNumber] of prefixMap.entries()) {
    const existing = existingMap.get(prefixCode) as CounterRow | undefined;
    if (!existing) {
      rowsToInsert.push({ prefix_code: prefixCode, last_number: lastNumber });
      continue;
    }

    if (Number(existing.last_number ?? 0) < lastNumber) {
      rowsToUpdate.push({ prefix_code: prefixCode, last_number: lastNumber });
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("code_counter")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert code_counter failed: ${insertError.message}`);
    }
  }

  if (rowsToUpdate.length > 0) {
    const updateResults = await Promise.all(
      rowsToUpdate.map((row) =>
        supabase
          .from("code_counter")
          .update({ last_number: row.last_number })
          .eq("prefix_code", row.prefix_code),
      ),
    );

    const updateError = updateResults.find((result) => result.error)?.error;
    if (updateError) {
      throw new Error(`Update code_counter failed: ${updateError.message}`);
    }
  }

  const insertedCount = rowsToInsert.length + rowsToUpdate.length;

  return {
    table: "code_counter",
    total: prefixMap.size,
    inserted: insertedCount,
    skipped: prefixMap.size - insertedCount,
  };
}
