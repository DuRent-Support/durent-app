import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateExpendableCode,
  listExpendablesWithRelations,
  parseExpendablePayload,
  syncExpendableRelations,
} from "./_shared";
import { requireAdmin } from "../master-data/_shared";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const items = await listExpendablesWithRelations();
    return NextResponse.json({ expendables: items }, { status: 200 });
  } catch (error) {
    console.error("Get admin expendables error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data expendable." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const payload = parseExpendablePayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateExpendableCode(payload.data);

    const { data, error } = await serviceRoleClient
      .from("expendables")
      .insert({
        uuid: crypto.randomUUID(),
        code: generatedCode,
        name: payload.data.name,
        description: payload.data.description,
        price: payload.data.price,
        is_available: payload.data.is_available,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    await syncExpendableRelations(Number(data.id), payload.data);

    return NextResponse.json(
      {
        message: "Expendable berhasil ditambahkan.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin expendable error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan expendable." },
      { status: 500 },
    );
  }
}
