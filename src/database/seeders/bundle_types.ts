import type { SupabaseClient } from "@supabase/supabase-js";

import { seedMasterTable, type SeederRow } from "./_shared";

const bundleTypesDummyRows: SeederRow[] = [
  { name: "Bundling Items", short_code: "BI" },
  { name: "Bundling Crews", short_code: "BC" },
  { name: "Bundling Expendables", short_code: "BE" },
  { name: "Bundling Foods & Beverages", short_code: "BFB" },
  { name: "Bundling All", short_code: "BA" },
];

export async function seedBundleTypes(supabase: SupabaseClient) {
  return seedMasterTable(supabase, "bundle_types", bundleTypesDummyRows);
}
