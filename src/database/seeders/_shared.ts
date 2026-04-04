import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SeederRow = {
  name: string;
  short_code: string;
};

export type SeederResult = {
  table: string;
  total: number;
  inserted: number;
  skipped: number;
};

export function createSeederClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing env NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function seedMasterTable(
  supabase: SupabaseClient,
  table: string,
  rows: SeederRow[],
): Promise<SeederResult> {
  if (rows.length === 0) {
    return {
      table,
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const shortCodes = rows.map((row) => row.short_code);

  const { data: existingRows, error: selectError } = await supabase
    .from(table)
    .select("short_code")
    .in("short_code", shortCodes);

  if (selectError) {
    throw new Error(`Select ${table} failed: ${selectError.message}`);
  }

  const existingShortCodes = new Set(
    (existingRows ?? []).map((row) => String(row.short_code ?? "")),
  );

  const rowsToInsert = rows.filter(
    (row) => !existingShortCodes.has(row.short_code),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from(table)
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert ${table} failed: ${insertError.message}`);
    }
  }

  return {
    table,
    total: rows.length,
    inserted: rowsToInsert.length,
    skipped: rows.length - rowsToInsert.length,
  };
}
