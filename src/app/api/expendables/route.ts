import { NextResponse } from "next/server";

import type { Expendable } from "@/types";

import { listExpendablesWithRelations } from "../admin/expendables/_shared";

export async function GET() {
  try {
    const records = (await listExpendablesWithRelations()) as Expendable[];
    const items = records.filter((item) => Boolean(item.is_available));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Get expendables error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data expendables." },
      { status: 500 },
    );
  }
}
