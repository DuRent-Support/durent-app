import type { SupabaseClient } from "@supabase/supabase-js";

import { seedMasterTable, type SeederRow } from "../_shared";

const bundleCategoriesDummyRows: SeederRow[] = [
  { name: "Communication", short_code: "CM" },
  { name: "Medic", short_code: "MD" },
  { name: "Electrical", short_code: "ET" },
  { name: "Power", short_code: "PW" },
  { name: "Safety", short_code: "SF" },
  { name: "Others", short_code: "OT" },
  { name: "Expandables", short_code: "EP" },
  { name: "Transport", short_code: "TP" },
  { name: "Snack & Beverage", short_code: "SB" },
  { name: "Catering", short_code: "CT" },
  { name: "Addon", short_code: "AO" },
  { name: "Crew", short_code: "CW" },
  { name: "Production Unit", short_code: "PU" },
];

export async function seedBundleCategories(supabase: SupabaseClient) {
  return seedMasterTable(
    supabase,
    "bundle_categories",
    bundleCategoriesDummyRows,
  );
}
