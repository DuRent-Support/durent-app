import { createMasterData, listMasterData } from "../master-data/_shared";

const TABLE = "bundle_categories";

export async function GET() {
  return listMasterData(TABLE, {
    tables: ["bundle_category"],
    foreignKey: "bundle_category_id",
  });
}

export async function POST(request: Request) {
  return createMasterData(TABLE, request);
}
