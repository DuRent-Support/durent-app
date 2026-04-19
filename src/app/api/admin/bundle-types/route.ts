import { createMasterData, listMasterData } from "../master-data/_shared";

const TABLE = "bundle_types";

export async function GET() {
  return listMasterData(TABLE, {
    tables: ["bundle_type"],
    foreignKey: "bundle_type_id",
  });
}

export async function POST(request: Request) {
  return createMasterData(TABLE, request);
}
