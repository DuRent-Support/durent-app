import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateRentalCode,
  listRentalsWithRelations,
  parseRentalPayload,
  syncRentalRelations,
} from "./_shared";
import { requireAdmin } from "../master-data/_shared";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const items = await listRentalsWithRelations();
    return NextResponse.json({ rentals: items }, { status: 200 });
  } catch (error) {
    console.error("Get admin rentals error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data rental." },
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

    const payload = parseRentalPayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateRentalCode(payload.data);

    const { data, error } = await serviceRoleClient
      .from("rentals")
      .insert({
        uuid: crypto.randomUUID(),
        code: generatedCode,
        name: payload.data.name,
        description: payload.data.description,
        price: payload.data.price,
        specifications: payload.data.specifications,
        is_available: payload.data.is_available,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    await syncRentalRelations(Number(data.id), payload.data);

    return NextResponse.json(
      {
        message: "Rental berhasil ditambahkan.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin rental error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan rental." },
      { status: 500 },
    );
  }
}
