import { seedBundleCategories } from "./bundle_categories";
import { seedBundleTypes } from "./bundle_types";
import { createSeederClient } from "./_shared";
import { seedItemCategories } from "./item_categories";
import { seedItemSubCategories } from "./item_sub_categories";

export async function runAllSeeders() {
  const supabase = createSeederClient();

  const results = [];
  results.push(await seedBundleCategories(supabase));
  results.push(await seedBundleTypes(supabase));
  results.push(await seedItemCategories(supabase));
  results.push(await seedItemSubCategories(supabase));

  for (const result of results) {
    console.info(
      `[seeder] ${result.table}: inserted=${result.inserted}, skipped=${result.skipped}, total=${result.total}`,
    );
  }
}

runAllSeeders();
