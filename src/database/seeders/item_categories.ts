import type { SupabaseClient } from "@supabase/supabase-js";

import { seedMasterTable, type SeederRow } from "./_shared";

const itemCategoriesDummyRows: SeederRow[] = [
  { name: "Communication", short_code: "CM" },
  { name: "Medic", short_code: "MD" },
  { name: "Electrical", short_code: "ET" },
  { name: "Power", short_code: "PW" },
  { name: "Safety", short_code: "SF" },
  { name: "Others", short_code: "OT" },
  { name: "Expendables", short_code: "EP" },
  { name: "Transport", short_code: "TP" },
  { name: "Snack & Beverage", short_code: "SB" },
  { name: "Catering", short_code: "CT" },
  { name: "Unit Production Manager", short_code: "UPM" },
  { name: "Runner", short_code: "RN" },
  { name: "Production Unit", short_code: "PU" },
  { name: "Addon", short_code: "AO" },
];

export async function seedItemCategories(supabase: SupabaseClient) {
  return seedMasterTable(supabase, "item_categories", itemCategoriesDummyRows);
}
