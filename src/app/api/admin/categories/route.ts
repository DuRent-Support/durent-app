import { createMasterData, listMasterData } from "../master-data/_shared";

const TABLE = "item_categories";

export async function GET() {
  return listMasterData(TABLE, {
    tables: [
      "location_item_category",
      "crew_item_category",
      "rental_item_category",
      "expendable_item_category",
      "food_and_beverage_item_category",
    ],
    foreignKey: "item_category_id",
  });
}

export async function POST(request: Request) {
  return createMasterData(TABLE, request);
}
