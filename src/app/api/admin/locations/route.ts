import { NextResponse } from "next/server";

import { insertAdminLocationEmbedding } from "@/lib/embedding";
import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateLocationCode,
  listLocationsWithRelations,
  parseLocationPayload,
  syncLocationRelations,
} from "./_shared";
import { requireAdmin } from "../master-data/_shared";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const items = await listLocationsWithRelations();
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Get admin locations error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data lokasi." },
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

    const parsedPayload = parseLocationPayload(await request.json());
    if (!parsedPayload.ok) {
      return NextResponse.json(
        { message: parsedPayload.message },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateLocationCode(parsedPayload.data);

    const createResult = await serviceRoleClient
      .from("locations")
      .insert({
        uuid: crypto.randomUUID(),
        code: generatedCode,
        name: parsedPayload.data.name,
        description: parsedPayload.data.description,
        city: parsedPayload.data.city,
        price: parsedPayload.data.price,
        area: parsedPayload.data.area,
        pax: parsedPayload.data.pax,
        is_available: parsedPayload.data.is_available,
        rating: 0,
      })
      .select("id")
      .single();

    if (createResult.error) {
      return NextResponse.json(
        { message: createResult.error.message },
        { status: 400 },
      );
    }

    await syncLocationRelations(createResult.data.id, parsedPayload.data);

    const [itemCategoriesResult, itemSubCategoriesResult] = await Promise.all([
      parsedPayload.data.item_category_ids.length > 0
        ? serviceRoleClient
            .from("item_categories")
            .select("name")
            .in("id", parsedPayload.data.item_category_ids)
        : Promise.resolve({ data: [], error: null }),
      parsedPayload.data.item_sub_category_ids.length > 0
        ? serviceRoleClient
            .from("item_sub_categories")
            .select("name")
            .in("id", parsedPayload.data.item_sub_category_ids)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (itemCategoriesResult.error) {
      return NextResponse.json(
        { message: itemCategoriesResult.error.message },
        { status: 400 },
      );
    }

    if (itemSubCategoriesResult.error) {
      return NextResponse.json(
        { message: itemSubCategoriesResult.error.message },
        { status: 400 },
      );
    }

    await insertAdminLocationEmbedding({
      location_id: createResult.data.id,
      code: generatedCode,
      name: parsedPayload.data.name,
      city: parsedPayload.data.city,
      description: parsedPayload.data.description,
      price: parsedPayload.data.price,
      area: parsedPayload.data.area,
      pax: parsedPayload.data.pax,
      rating: 0,
      is_available: parsedPayload.data.is_available,
      tags: [],
      item_categories: (itemCategoriesResult.data ?? [])
        .map((row) => String((row as { name?: string | null }).name ?? ""))
        .filter(Boolean),
      item_sub_categories: (itemSubCategoriesResult.data ?? [])
        .map((row) => String((row as { name?: string | null }).name ?? ""))
        .filter(Boolean),
    });

    return NextResponse.json(
      { message: "Lokasi berhasil ditambahkan." },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin location error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan lokasi." },
      { status: 500 },
    );
  }
}
