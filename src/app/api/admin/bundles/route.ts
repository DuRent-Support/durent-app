import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  calculateBundlePrices,
  generateBundleCode,
  getBundleItemPriceMaps,
  listBundlesWithRelations,
  parseBundlePayload,
  syncBundleRelations,
} from "./_shared";
import { requireAdmin } from "../master-data/_shared";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const items = await listBundlesWithRelations();
    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Get admin bundles error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data bundle." },
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

    const payload = parseBundlePayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateBundleCode(payload.data);
    const priceMaps = await getBundleItemPriceMaps(payload.data);
    const prices = calculateBundlePrices(payload.data, priceMaps);

    const { data, error } = await serviceRoleClient
      .from("bundles")
      .insert({
        uuid: crypto.randomUUID(),
        code: generatedCode,
        name: payload.data.name,
        description: payload.data.description,
        is_active: payload.data.is_active,
        base_price: prices.basePrice,
        discount_type: prices.discountType,
        discount_value: prices.discountValue,
        final_price: prices.finalPrice,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    await syncBundleRelations(Number(data.id), payload.data);

    return NextResponse.json(
      {
        message: "Bundle berhasil ditambahkan.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin bundle error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan bundle." },
      { status: 500 },
    );
  }
}
