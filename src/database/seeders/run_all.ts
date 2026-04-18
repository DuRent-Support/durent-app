import { seedBundleCategories } from "./categories/bundle_categories";
import { seedBundleTypes } from "./categories/bundle_types";
import { seedItemCategories } from "./categories/item_categories";
import { seedItemSubCategories } from "./categories/item_sub_categories";

import { seedBundles } from "./bundles/bundles";
import { seedBundleTypePivot } from "./bundles/bundle_type_pivot";
import { seedBundleCategoryPivot } from "./bundles/bundle_category_pivot";

import { seedLocations, seedLocationEmbeddings } from "./locations/locations";
import { seedLocationItemCategory } from "./locations/location_item_category";
import { seedLocationItemSubCategory } from "./locations/location_item_sub_category";

import { seedRentals } from "./rentals/rentals";
import { seedRentalItemCategory } from "./rentals/rental_item_category";
import { seedRentalItemSubCategory } from "./rentals/rental_item_sub_category";

import { seedFoodAndBeverage } from "./food_and_beverage/food_and_beverage";
import { seedFoodAndBeverageItemCategory } from "./food_and_beverage/food_and_beverage_item_category";
import { seedFoodAndBeverageItemSubCategory } from "./food_and_beverage/food_and_beverage_item_sub_category";

import { seedExpendables } from "./expendables/expendables";
import { seedExpendableItemCategory } from "./expendables/expendable_item_category";
import { seedExpendableItemSubCategory } from "./expendables/expendable_item_sub_category";

import { seedPromoCodes } from "./promo_codes";
import { seedCodeCounter } from "./code_counter";
import { createSeederClient } from "./_shared";

export async function runAllSeeders() {
  const supabase = createSeederClient();

  const results = [];

  // Master categories
  results.push(await seedBundleCategories(supabase));
  results.push(await seedBundleTypes(supabase));
  results.push(await seedItemCategories(supabase));
  results.push(await seedItemSubCategories(supabase));

  // Locations
  results.push(await seedLocations(supabase));
  results.push(await seedLocationEmbeddings(supabase));
  results.push(await seedLocationItemCategory(supabase));
  results.push(await seedLocationItemSubCategory(supabase));

  // Rentals
  results.push(await seedRentals(supabase));
  results.push(await seedRentalItemCategory(supabase));
  results.push(await seedRentalItemSubCategory(supabase));

  // Food & Beverage
  results.push(await seedFoodAndBeverage(supabase));
  results.push(await seedFoodAndBeverageItemCategory(supabase));
  results.push(await seedFoodAndBeverageItemSubCategory(supabase));

  // Expendables
  results.push(await seedExpendables(supabase));
  results.push(await seedExpendableItemCategory(supabase));
  results.push(await seedExpendableItemSubCategory(supabase));

  // Crews (disabled - import from ./crews/* and uncomment to seed)
  // results.push(await seedCrews(supabase));
  // results.push(await seedCrewItemCategory(supabase));
  // results.push(await seedCrewItemSubCategory(supabase));

  // Bundles (master + items first, then pivot tables)
  results.push(await seedBundles(supabase));
  results.push(await seedBundleTypePivot(supabase));
  results.push(await seedBundleCategoryPivot(supabase));

  // Other
  results.push(await seedPromoCodes(supabase));
  results.push(await seedCodeCounter(supabase));

  for (const result of results) {
    console.info(
      `[seeder] ${result.table}: inserted=${result.inserted}, skipped=${result.skipped}, total=${result.total}`,
    );
  }
}

runAllSeeders();
