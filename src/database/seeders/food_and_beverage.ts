import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type FoodAndBeverageRow = {
  code: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
};

const foodAndBeverageRows: FoodAndBeverageRow[] = [
  {
    code: "DS-FB-SB-SN-0001",
    name: "Snacks (20 Crews)",
    description: "Paket snack untuk 20 kru.",
    price: 100000,
    is_available: true,
  },
  {
    code: "DS-FB-SB-SN-0002",
    name: "Snacks (30 Crews)",
    description: "Paket snack untuk 30 kru.",
    price: 140000,
    is_available: true,
  },
  {
    code: "DS-FB-SB-SN-0003",
    name: "Snacks (40 Crews)",
    description: "Paket snack untuk 40 kru.",
    price: 190000,
    is_available: true,
  },
  {
    code: "DS-FB-SB-BV-0001",
    name: "Beverages (20 Crews)",
    description: "Paket minuman untuk 20 kru.",
    price: 90000,
    is_available: true,
  },
  {
    code: "DS-FB-SB-BV-0002",
    name: "Beverages (30 Crews)",
    description: "Paket minuman untuk 30 kru.",
    price: 130000,
    is_available: true,
  },
  {
    code: "DS-FB-SB-BV-0003",
    name: "Beverages (40 Crews)",
    description: "Paket minuman untuk 40 kru.",
    price: 180000,
    is_available: true,
  },
  {
    code: "DS-FB-CT-PC-0001",
    name: "Catering Paket A",
    description: "Paket catering A untuk kru produksi.",
    price: 15000,
    is_available: true,
  },
  {
    code: "DS-FB-CT-PC-0002",
    name: "Catering Paket B",
    description: "Paket catering B untuk kru produksi.",
    price: 20000,
    is_available: true,
  },
  {
    code: "DS-FB-CT-PC-0003",
    name: "Catering Paket C",
    description: "Paket catering C untuk kru produksi.",
    price: 25000,
    is_available: true,
  },
  {
    code: "DS-FB-CT-PC-0004",
    name: "Catering Paket D",
    description: "Paket catering D untuk kru produksi.",
    price: 30000,
    is_available: true,
  },
];

export async function seedFoodAndBeverage(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (foodAndBeverageRows.length === 0) {
    return {
      table: "food_and_beverage",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const codes = foodAndBeverageRows.map((row) => row.code);
  const { data: existingRows, error: selectError } = await supabase
    .from("food_and_beverage")
    .select("code")
    .in("code", codes);

  if (selectError) {
    throw new Error(`Select food_and_beverage failed: ${selectError.message}`);
  }

  const existingCodes = new Set(
    (existingRows ?? []).map((row) => String(row.code ?? "")),
  );

  const rowsToInsert = foodAndBeverageRows
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
      .from("food_and_beverage")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(
        `Insert food_and_beverage failed: ${insertError.message}`,
      );
    }
  }

  return {
    table: "food_and_beverage",
    total: foodAndBeverageRows.length,
    inserted: rowsToInsert.length,
    skipped: foodAndBeverageRows.length - rowsToInsert.length,
  };
}
