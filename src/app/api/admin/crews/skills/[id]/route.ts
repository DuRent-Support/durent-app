import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import { requireAdmin } from "../../../master-data/_shared";

type CrewSkillRow = {
  id?: string | number | null;
  name?: string | null;
  description?: string | null;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function mapCrewSkillRow(row: CrewSkillRow) {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    crews: 0,
  };
}

function parsePayload(payload: { name?: string; description?: string }) {
  const name = String(payload.name ?? "").trim();
  const description = String(payload.description ?? "").trim();

  if (!name) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Name wajib diisi." },
        { status: 400 },
      ),
    };
  }

  if (!description) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Description wajib diisi." },
        { status: 400 },
      ),
    };
  }

  return { ok: true as const, name, description };
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await params;
    const payload = parsePayload(
      (await request.json()) as { name?: string; description?: string },
    );
    if (!payload.ok) {
      return payload.response;
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data, error } = await serviceRoleClient
      .from("crew_skills")
      .update({
        name: payload.name,
        description: payload.description,
      })
      .eq("id", id)
      .select("id, name, description")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Skill crew tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Skill crew berhasil diupdate.",
        item: mapCrewSkillRow(data),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update crew skill error:", error);
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
      .from("crew_skills")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Skill crew tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Skill crew berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete crew skill error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus data." },
      { status: 500 },
    );
  }
}
