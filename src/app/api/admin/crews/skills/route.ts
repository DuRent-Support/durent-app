import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import { requireAdmin } from "../../master-data/_shared";

type CrewSkillRow = {
  id?: string | number | null;
  name?: string | null;
  description?: string | null;
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

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const serviceRoleClient = createServiceRoleClient();
    const { data, error } = await serviceRoleClient
      .from("crew_skills")
      .select("id, name, description")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { items: (data ?? []).map((row) => mapCrewSkillRow(row)) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get crew skills error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data." },
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

    const payload = parsePayload(
      (await request.json()) as { name?: string; description?: string },
    );
    if (!payload.ok) {
      return payload.response;
    }

    const serviceRoleClient = createServiceRoleClient();
    const { data, error } = await serviceRoleClient
      .from("crew_skills")
      .insert({
        name: payload.name,
        description: payload.description,
      })
      .select("id, name, description")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: "Skill crew berhasil ditambahkan.",
        item: mapCrewSkillRow(data),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create crew skill error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan data." },
      { status: 500 },
    );
  }
}
