import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateExpendableCode,
  parseExpendablePayload,
  syncExpendableRelations,
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
    const expendableId = Number(id);
    if (!Number.isInteger(expendableId)) {
      return NextResponse.json(
        { message: "ID expendable tidak valid." },
        { status: 400 },
      );
    }

    const payload = parseExpendablePayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateExpendableCode(payload.data, {
      excludeExpendableId: expendableId,
    });

    const updateResult = await serviceRoleClient
      .from("expendables")
      .update({
        code: generatedCode,
        name: payload.data.name,
        description: payload.data.description,
        price: payload.data.price,
        is_available: payload.data.is_available,
      })
      .eq("id", expendableId)
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
        { message: "Expendable tidak ditemukan." },
        { status: 404 },
      );
    }

    await syncExpendableRelations(expendableId, payload.data);

    return NextResponse.json(
      { message: "Expendable berhasil diupdate." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update admin expendable error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate expendable." },
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
    const expendableId = Number(id);
    if (!Number.isInteger(expendableId)) {
      return NextResponse.json(
        { message: "ID expendable tidak valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const [deleteCategory, deleteSubCategory, deleteImages] = await Promise.all(
      [
        serviceRoleClient
          .from("expendable_item_category")
          .delete()
          .eq("expendable_id", expendableId),
        serviceRoleClient
          .from("expendable_item_sub_category")
          .delete()
          .eq("expendable_id", expendableId),
        serviceRoleClient
          .from("expendable_images")
          .delete()
          .eq("expendable_id", expendableId),
      ],
    );

    const relationError =
      deleteCategory.error || deleteSubCategory.error || deleteImages.error;

    if (relationError) {
      return NextResponse.json(
        { message: relationError.message },
        { status: 400 },
      );
    }

    const deleteExpendable = await serviceRoleClient
      .from("expendables")
      .delete()
      .eq("id", expendableId)
      .select("id")
      .maybeSingle();

    if (deleteExpendable.error) {
      return NextResponse.json(
        { message: deleteExpendable.error.message },
        { status: 400 },
      );
    }

    if (!deleteExpendable.data) {
      return NextResponse.json(
        { message: "Expendable tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Expendable berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete admin expendable error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus expendable." },
      { status: 500 },
    );
  }
}
