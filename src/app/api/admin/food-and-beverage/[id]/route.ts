import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateFoodAndBeverageCode,
  parseFoodAndBeveragePayload,
  syncFoodAndBeverageRelations,
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
    const recordId = Number(id);
    if (!Number.isInteger(recordId)) {
      return NextResponse.json(
        { message: "ID food & beverage tidak valid." },
        { status: 400 },
      );
    }

    const payload = parseFoodAndBeveragePayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateFoodAndBeverageCode(payload.data, {
      excludeFoodAndBeverageId: recordId,
    });

    const updateResult = await serviceRoleClient
      .from("food_and_beverage")
      .update({
        code: generatedCode,
        name: payload.data.name,
        description: payload.data.description,
        price: payload.data.price,
        is_available: payload.data.is_available,
      })
      .eq("id", recordId)
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
        { message: "Food & beverage tidak ditemukan." },
        { status: 404 },
      );
    }

    await syncFoodAndBeverageRelations(recordId, payload.data);

    return NextResponse.json(
      { message: "Food & beverage berhasil diupdate." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update admin food & beverage error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate food & beverage." },
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
    const recordId = Number(id);
    if (!Number.isInteger(recordId)) {
      return NextResponse.json(
        { message: "ID food & beverage tidak valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const [deleteTags, deleteCategory, deleteSubCategory, deleteImages] =
      await Promise.all([
        serviceRoleClient
          .from("food_and_beverage_tag")
          .delete()
          .eq("food_and_beverage_id", recordId),
        serviceRoleClient
          .from("food_and_beverage_item_category")
          .delete()
          .eq("food_and_beverage_id", recordId),
        serviceRoleClient
          .from("food_and_beverage_item_sub_category")
          .delete()
          .eq("food_and_beverage_id", recordId),
        serviceRoleClient
          .from("food_and_beverage_images")
          .delete()
          .eq("food_and_beverage_id", recordId),
      ]);

    const relationError =
      deleteTags.error ||
      deleteCategory.error ||
      deleteSubCategory.error ||
      deleteImages.error;

    if (relationError) {
      return NextResponse.json(
        { message: relationError.message },
        { status: 400 },
      );
    }

    const deleteResult = await serviceRoleClient
      .from("food_and_beverage")
      .delete()
      .eq("id", recordId)
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
        { message: "Food & beverage tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Food & beverage berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete admin food & beverage error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus food & beverage." },
      { status: 500 },
    );
  }
}
