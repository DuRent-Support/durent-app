import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import { requireAdmin } from "../../../master-data/_shared";

type FoodAndBeverageTagRow = {
  id?: string | number | null;
  name?: string | null;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mapFoodAndBeverageTagRow(row: FoodAndBeverageTagRow) {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    foodAndBeverages: 0,
  };
}

function parsePayload(payload: { name?: string }) {
  const name = String(payload.name ?? "").trim();

  if (!name) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Name wajib diisi." },
        { status: 400 },
      ),
    };
  }

  return { ok: true as const, name };
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await params;
    const payload = parsePayload((await request.json()) as { name?: string });
    if (!payload.ok) {
      return payload.response;
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data: existing, error: checkError } = await serviceRoleClient
      .from("food_and_beverage_tags")
      .select("id")
      .eq("name", payload.name)
      .neq("id", id)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json(
        { message: checkError.message },
        { status: 400 },
      );
    }

    if (existing) {
      return NextResponse.json(
        { message: "Food & beverage tag sudah ada." },
        { status: 400 },
      );
    }

    const { data, error } = await serviceRoleClient
      .from("food_and_beverage_tags")
      .update({ name: payload.name })
      .eq("id", id)
      .select("id, name")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Food & beverage tag tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Food & beverage tag berhasil diupdate.",
        item: mapFoodAndBeverageTagRow(data),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update food & beverage tag error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate data." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await params;
    const serviceRoleClient = createServiceRoleClient();

    const { data, error } = await serviceRoleClient
      .from("food_and_beverage_tags")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Food & beverage tag tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Food & beverage tag berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete food & beverage tag error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus data." },
      { status: 500 },
    );
  }
}
