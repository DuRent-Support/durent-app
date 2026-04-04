import { removeMasterData, updateMasterData } from "../../master-data/_shared";

const TABLE = "bundle_categories";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  return updateMasterData(TABLE, id, request);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  return removeMasterData(TABLE, id);
}
