import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "../_shared";

type CrewRow = {
  code: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
};

const crewRows: CrewRow[] = [
  {
    code: "DS-CW-UPM-0001",
    name: "Unit Production Manager - DuRent",
    description: "Mengelola kebutuhan produksi dan koordinasi kru.",
    price: 750000,
    is_available: true,
  },
];

export async function seedCrews(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (crewRows.length === 0) {
    return {
      table: "crews",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const codes = crewRows.map((row) => row.code);
  const { data: existingRows, error: selectError } = await supabase
    .from("crews")
    .select("code")
    .in("code", codes);

  if (selectError) {
    throw new Error(`Select crews failed: ${selectError.message}`);
  }

  const existingCodes = new Set(
    (existingRows ?? []).map((row) => String(row.code ?? "")),
  );

  const rowsToInsert = crewRows
    .filter((row) => !existingCodes.has(row.code))
    .map((row) => ({
      uuid: randomUUID(),
      code: row.code,
      name: row.name,
      description: row.description,
      price: row.price,
      is_available: row.is_available,
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("crews")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert crews failed: ${insertError.message}`);
    }
  }

  return {
    table: "crews",
    total: crewRows.length,
    inserted: rowsToInsert.length,
    skipped: crewRows.length - rowsToInsert.length,
  };
}
