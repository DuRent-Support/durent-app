import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateRentalCode,
  parseRentalPayload,
  syncRentalRelations,
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
    const rentalId = Number(id);
    if (!Number.isInteger(rentalId)) {
      return NextResponse.json(
        { message: "ID rental tidak valid." },
        { status: 400 },
      );
    }

    const payload = parseRentalPayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateRentalCode(payload.data, {
      excludeRentalId: rentalId,
    });

    const updateResult = await serviceRoleClient
      .from("rentals")
      .update({
        code: generatedCode,
        name: payload.data.name,
        description: payload.data.description,
        price: payload.data.price,
        specifications: payload.data.specifications,
        is_available: payload.data.is_available,
      })
      .eq("id", rentalId)
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
        { message: "Rental tidak ditemukan." },
        { status: 404 },
      );
    }

    await syncRentalRelations(rentalId, payload.data);

    return NextResponse.json(
      { message: "Rental berhasil diupdate." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update admin rental error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate rental." },
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
    const rentalId = Number(id);
    if (!Number.isInteger(rentalId)) {
      return NextResponse.json(
        { message: "ID rental tidak valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const [deleteCategory, deleteSubCategory, deleteImages] = await Promise.all(
      [
        serviceRoleClient
          .from("rental_item_category")
          .delete()
          .eq("rental_id", rentalId),
        serviceRoleClient
          .from("rental_item_sub_category")
          .delete()
          .eq("rental_id", rentalId),
        serviceRoleClient
          .from("rental_images")
          .delete()
          .eq("rental_id", rentalId),
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

    const deleteRental = await serviceRoleClient
      .from("rentals")
      .delete()
      .eq("id", rentalId)
      .select("id")
      .maybeSingle();

    if (deleteRental.error) {
      return NextResponse.json(
        { message: deleteRental.error.message },
        { status: 400 },
      );
    }

    if (!deleteRental.data) {
      return NextResponse.json(
        { message: "Rental tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Rental berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete admin rental error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus rental." },
      { status: 500 },
    );
  }
}
