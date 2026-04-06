import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type PromoCodeRow = {
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_usage: number | null;
  usage_count: number;
  max_usage_per_user: number | null;
  min_order_amount: number;
  is_active: boolean;
};

const promoCodeRows: PromoCodeRow[] = [
  {
    code: "Martin Code",
    discount_type: "percent",
    discount_value: 10,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Ucifest Code",
    discount_type: "percent",
    discount_value: 50,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Andreas Code",
    discount_type: "percent",
    discount_value: 10,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Jeff Jeremy Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Nazya Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Anastasius Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Yoga Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Kezia Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Raihan Code",
    discount_type: "fixed",
    discount_value: 50000,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Enriche Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Yoko Code",
    discount_type: "percent",
    discount_value: 30,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Andreas Code 2",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Yoga Code 2",
    discount_type: "percent",
    discount_value: 35,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "TEMANANDREASDRS1",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Savio Code",
    discount_type: "percent",
    discount_value: 10,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Jasyen Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "TEMANDURENT1",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Zaky Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Bagas Code",
    discount_type: "percent",
    discount_value: 35,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Jason Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Marco Nyetir",
    discount_type: "fixed",
    discount_value: 350000,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Bryan Code",
    discount_type: "percent",
    discount_value: 35,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Gilbert Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Athea Recce",
    discount_type: "percent",
    discount_value: 100,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Athea Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "Sabil Code",
    discount_type: "percent",
    discount_value: 20,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "50",
    discount_type: "percent",
    discount_value: 50,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "UCIFEST17 code",
    discount_type: "percent",
    discount_value: 50,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "10",
    discount_type: "percent",
    discount_value: 10,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
  {
    code: "TA hexadec ROY",
    discount_type: "percent",
    discount_value: 60,
    max_usage: 1000,
    usage_count: 0,
    max_usage_per_user: 1,
    min_order_amount: 0,
    is_active: true,
  },
];

export async function seedPromoCodes(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (promoCodeRows.length === 0) {
    return {
      table: "promo_codes",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const codes = promoCodeRows.map((row) => row.code);
  const { data: existingRows, error: selectError } = await supabase
    .from("promo_codes")
    .select("code")
    .in("code", codes);

  if (selectError) {
    throw new Error(`Select promo_codes failed: ${selectError.message}`);
  }

  const existingCodes = new Set(
    (existingRows ?? []).map((row) => String(row.code ?? "")),
  );

  const rowsToInsert = promoCodeRows.filter(
    (row) => !existingCodes.has(row.code),
  );

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("promo_codes")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert promo_codes failed: ${insertError.message}`);
    }
  }

  return {
    table: "promo_codes",
    total: promoCodeRows.length,
    inserted: rowsToInsert.length,
    skipped: promoCodeRows.length - rowsToInsert.length,
  };
}
