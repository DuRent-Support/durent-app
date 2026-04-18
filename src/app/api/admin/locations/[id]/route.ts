import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateLocationCode,
  parseLocationPayload,
  syncLocationRelations,
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
    const locationId = Number(id);
    if (!Number.isInteger(locationId)) {
      return NextResponse.json(
        { message: "ID lokasi tidak valid." },
        { status: 400 },
      );
    }

    const parsedPayload = parseLocationPayload(await request.json());
    if (!parsedPayload.ok) {
      return NextResponse.json(
        { message: parsedPayload.message },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateLocationCode(parsedPayload.data, {
      excludeLocationId: locationId,
    });

    const updateResult = await serviceRoleClient
      .from("locations")
      .update({
        code: generatedCode,
        name: parsedPayload.data.name,
        description: parsedPayload.data.description,
        city: parsedPayload.data.city,
        price: parsedPayload.data.price,
        area: parsedPayload.data.area,
        pax: parsedPayload.data.pax,
        is_available: parsedPayload.data.is_available,
      })
      .eq("id", locationId)
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
        { message: "Lokasi tidak ditemukan." },
        { status: 404 },
      );
    }

    await syncLocationRelations(locationId, parsedPayload.data);

    return NextResponse.json(
      { message: "Lokasi berhasil diupdate." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update admin location error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate lokasi." },
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
    const locationId = Number(id);
    if (!Number.isInteger(locationId)) {
      return NextResponse.json(
        { message: "ID lokasi tidak valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const cleanupTasks = [
      serviceRoleClient
        .from("location_item_category")
        .delete()
        .eq("location_id", locationId),
      serviceRoleClient
        .from("location_item_sub_category")
        .delete()
        .eq("location_id", locationId),
      serviceRoleClient
        .from("location_images")
        .delete()
        .eq("location_id", locationId),
      serviceRoleClient
        .from("location_embeddings")
        .delete()
        .eq("location_id", locationId),
      serviceRoleClient
        .from("location_reviews")
        .delete()
        .eq("location_id", locationId),
    ];

    const cleanupResults = await Promise.all(cleanupTasks);
    const cleanupError = cleanupResults.find((result) => result.error)?.error;
    if (cleanupError) {
      return NextResponse.json(
        { message: cleanupError.message },
        { status: 400 },
      );
    }

    const deleteResult = await serviceRoleClient
      .from("locations")
      .delete()
      .eq("id", locationId)
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
        { message: "Lokasi tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Lokasi berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete admin location error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus lokasi." },
      { status: 500 },
    );
  }
}
