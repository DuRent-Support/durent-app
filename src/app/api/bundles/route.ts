import { NextResponse } from "next/server";

import type { Bundle } from "@/types";

import { listBundlesWithRelations } from "../admin/bundles/_shared";

export async function GET() {
  try {
    const records = (await listBundlesWithRelations()) as Bundle[];
    const items = records.filter((item) => Boolean(item.is_active));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Get bundles error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data bundles." },
      { status: 500 },
    );
  }
}
