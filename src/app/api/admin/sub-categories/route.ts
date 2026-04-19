import { createMasterData, listMasterData } from "../master-data/_shared";

const TABLE = "item_sub_categories";

export async function GET() {
  return listMasterData(TABLE, {
    tables: [
      "location_item_sub_category",
      "crew_item_sub_category",
      "rental_item_sub_category",
      "expendable_item_sub_category",
      "food_and_beverage_item_sub_category",
    ],
    foreignKey: "item_sub_category_id",
  });
}

export async function POST(request: Request) {
  return createMasterData(TABLE, request);
}
