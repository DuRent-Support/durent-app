import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  calculateBundlePrices,
  generateBundleCode,
  getBundleItemPriceMaps,
  parseBundlePayload,
  syncBundleRelations,
} from "../_shared";
import { requireAdmin } from "../../master-data/_shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await params;
    const bundleId = Number(id);
    if (!Number.isInteger(bundleId)) {
      return NextResponse.json(
        { message: "ID bundle tidak valid." },
        { status: 400 },
      );
    }

    const payload = parseBundlePayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateBundleCode(payload.data, {
      excludeBundleId: bundleId,
    });
    const priceMaps = await getBundleItemPriceMaps(payload.data);
    const prices = calculateBundlePrices(payload.data, priceMaps);

    const updateResult = await serviceRoleClient
      .from("bundles")
      .update({
        code: generatedCode,
        name: payload.data.name,
        description: payload.data.description,
        is_active: payload.data.is_active,
        base_price: prices.basePrice,
        discount_type: prices.discountType,
        discount_value: prices.discountValue,
        final_price: prices.finalPrice,
      })
      .eq("id", bundleId)
      .select("id")
      .maybeSingle();

    if (updateResult.error) {
      return NextResponse.json(
        { message: updateResult.error.message },
        { status: 400 },
      );
    }

    if (!updateResult.data) {
      return NextResponse.json(
        { message: "Bundle tidak ditemukan." },
        { status: 404 },
      );
    }

    await syncBundleRelations(bundleId, payload.data);

    return NextResponse.json(
      { message: "Bundle berhasil diupdate." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update admin bundle error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate bundle." },
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
    const bundleId = Number(id);
    if (!Number.isInteger(bundleId)) {
      return NextResponse.json(
        { message: "ID bundle tidak valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const [
      deleteType,
      deleteCategory,
      deleteCrew,
      deleteRental,
      deleteFood,
      deleteExpendable,
      deleteImage,
    ] = await Promise.all([
      serviceRoleClient.from("bundle_type").delete().eq("bundle_id", bundleId),
      serviceRoleClient
        .from("bundle_category")
        .delete()
        .eq("bundle_id", bundleId),
      serviceRoleClient.from("bundle_crews").delete().eq("bundle_id", bundleId),
      serviceRoleClient
        .from("bundle_rentals")
        .delete()
        .eq("bundle_id", bundleId),
      serviceRoleClient
        .from("bundle_food_and_beverage")
        .delete()
        .eq("bundle_id", bundleId),
      serviceRoleClient
        .from("bundle_expendables")
        .delete()
        .eq("bundle_id", bundleId),
      serviceRoleClient
        .from("bundle_images")
        .delete()
        .eq("bundle_id", bundleId),
    ]);

    const relationError = [
      deleteType.error,
      deleteCategory.error,
      deleteCrew.error,
      deleteRental.error,
      deleteFood.error,
      deleteExpendable.error,
      deleteImage.error,
    ].find(Boolean);

    if (relationError) {
      return NextResponse.json(
        { message: relationError.message },
        { status: 400 },
      );
    }

    const deleteResult = await serviceRoleClient
      .from("bundles")
      .delete()
      .eq("id", bundleId)
      .select("id")
      .maybeSingle();

    if (deleteResult.error) {
      return NextResponse.json(
        { message: deleteResult.error.message },
        { status: 400 },
      );
    }

    if (!deleteResult.data) {
      return NextResponse.json(
        { message: "Bundle tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Bundle berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete admin bundle error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus bundle." },
      { status: 500 },
    );
  }
}
