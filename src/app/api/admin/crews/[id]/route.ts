import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import {
  generateCrewCode,
  parseCrewPayload,
  syncCrewRelations,
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
    const crewId = Number(id);
    if (!Number.isInteger(crewId)) {
      return NextResponse.json(
        { message: "ID crew tidak valid." },
        { status: 400 },
      );
    }

    const payload = parseCrewPayload(await request.json());
    if (!payload.ok) {
      return NextResponse.json({ message: payload.message }, { status: 400 });
    }

    const serviceRoleClient = createServiceRoleClient();
    const generatedCode = await generateCrewCode(payload.data, {
      excludeCrewId: crewId,
    });

    const updateResult = await serviceRoleClient
      .from("crews")
      .update({
        code: generatedCode,
        name: payload.data.name,
        description: payload.data.description,
        price: payload.data.price,
        is_available: payload.data.is_available,
      })
      .eq("id", crewId)
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
        { message: "Crew tidak ditemukan." },
        { status: 404 },
      );
    }

    await syncCrewRelations(crewId, payload.data);

    return NextResponse.json(
      { message: "Crew berhasil diupdate." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update admin crew error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate crew." },
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
    const crewId = Number(id);
    if (!Number.isInteger(crewId)) {
      return NextResponse.json(
        { message: "ID crew tidak valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const [deleteSkills, deleteCategory, deleteSubCategory, deleteImages] =
      await Promise.all([
        serviceRoleClient.from("crew_skill").delete().eq("crew_id", crewId),
        serviceRoleClient
          .from("crew_item_category")
          .delete()
          .eq("crew_id", crewId),
        serviceRoleClient
          .from("crew_item_sub_category")
          .delete()
          .eq("crew_id", crewId),
        serviceRoleClient.from("crew_images").delete().eq("crew_id", crewId),
      ]);

    const relationError =
      deleteSkills.error ||
      deleteCategory.error ||
      deleteSubCategory.error ||
      deleteImages.error;

    if (relationError) {
      return NextResponse.json(
        { message: relationError.message },
        { status: 400 },
      );
    }

    const deleteCrew = await serviceRoleClient
      .from("crews")
      .delete()
      .eq("id", crewId)
      .select("id")
      .maybeSingle();

    if (deleteCrew.error) {
      return NextResponse.json(
        { message: deleteCrew.error.message },
        { status: 400 },
      );
    }

    if (!deleteCrew.data) {
      return NextResponse.json(
        { message: "Crew tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Crew berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete admin crew error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus crew." },
      { status: 500 },
    );
  }
}
