import { seedBundleCategories } from "./bundle_categories";
import { seedBundleTypes } from "./bundle_types";
import { seedBundles } from "./bundles";
import { seedCodeCounter } from "./code_counter";
import { seedCrews } from "./crews";
import { seedCrewItemCategory } from "./crew_item_category";
import { seedCrewItemSubCategory } from "./crew_item_sub_category";
import { seedCrewSkills } from "./crew_skills";
import { seedCrewSkillPivot } from "./crew_skill";
import { seedExpendableItemCategory } from "./expendable_item_category";
import { seedExpendableItemSubCategory } from "./expendable_item_sub_category";
import { seedExpendables } from "./expendables";
import { seedFoodAndBeverage } from "./food_and_beverage";
import { seedFoodAndBeverageItemCategory } from "./food_and_beverage_item_category";
import { seedFoodAndBeverageItemSubCategory } from "./food_and_beverage_item_sub_category";
import { seedFoodAndBeverageTagPivot } from "./food_and_beverage_tag";
import { seedFoodAndBeverageTags } from "./food_and_beverage_tags";
import { seedLocations, seedLocationEmbeddings } from "./locations";
import { seedLocationTagPivot } from "./location_tag";
import { seedLocationTags } from "./location_tags";
import { seedPromoCodes } from "./promo_codes";
import { seedRentalItemCategory } from "./rental_item_category";
import { seedRentalItemSubCategory } from "./rental_item_sub_category";
import { seedRentals } from "./rentals";
import { createSeederClient } from "./_shared";
import { seedItemCategories } from "./item_categories";
import { seedItemSubCategories } from "./item_sub_categories";

export async function runAllSeeders() {
  const supabase = createSeederClient();

  const results = [];
  results.push(await seedBundleCategories(supabase));
  results.push(await seedBundleTypes(supabase));
  results.push(await seedBundles(supabase));
  results.push(await seedItemCategories(supabase));
  results.push(await seedItemSubCategories(supabase));
  results.push(await seedLocations(supabase));
  results.push(await seedLocationTags(supabase));
  results.push(await seedLocationTagPivot(supabase));
  results.push(await seedLocationEmbeddings(supabase));
  results.push(await seedCrews(supabase));
  results.push(await seedCrewSkills(supabase));
  results.push(await seedCrewSkillPivot(supabase));
  results.push(await seedRentals(supabase));
  results.push(await seedFoodAndBeverage(supabase));
  results.push(await seedFoodAndBeverageTags(supabase));
  results.push(await seedFoodAndBeverageTagPivot(supabase));
  results.push(await seedExpendables(supabase));
  results.push(await seedCrewItemCategory(supabase));
  results.push(await seedCrewItemSubCategory(supabase));
  results.push(await seedRentalItemCategory(supabase));
  results.push(await seedRentalItemSubCategory(supabase));
  results.push(await seedFoodAndBeverageItemCategory(supabase));
  results.push(await seedFoodAndBeverageItemSubCategory(supabase));
  results.push(await seedExpendableItemCategory(supabase));
  results.push(await seedExpendableItemSubCategory(supabase));
  results.push(await seedPromoCodes(supabase));
  results.push(await seedCodeCounter(supabase));

  for (const result of results) {
    console.info(
      `[seeder] ${result.table}: inserted=${result.inserted}, skipped=${result.skipped}, total=${result.total}`,
    );
  }
}

runAllSeeders();
