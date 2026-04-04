import { createMasterData, listMasterData } from "../master-data/_shared";

const TABLE = "item_categories";

export async function GET() {
  return listMasterData(TABLE);
}

export async function POST(request: Request) {
  return createMasterData(TABLE, request);
}
