import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateCrewCode,
  listCrewsWithRelations,
  parseCrewPayload,
  syncCrewRelations,
} from "./_shared";
import { requireAdmin } from "../master-data/_shared";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const items = await listCrewsWithRelations();
    return NextResponse.json({ crews: items }, { status: 200 });
  } catch (error) {
    console.error("Get admin crews error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data crew." },
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

    const payload = parseCrewPayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateCrewCode(payload.data);

    const { data, error } = await serviceRoleClient
      .from("crews")
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

    await syncCrewRelations(Number(data.id), payload.data);

    return NextResponse.json(
      {
        message: "Crew berhasil ditambahkan.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin crew error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan crew." },
      { status: 500 },
    );
  }
}
