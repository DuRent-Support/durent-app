import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import { requireAdmin } from "../../master-data/_shared";

type LocationTagRow = {
  id?: string | number | null;
  name?: string | null;
};

function mapLocationTagRow(row: LocationTagRow) {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    locations: 0,
  };
}

function parsePayload(payload: { name?: string }) {
  const name = String(payload.name ?? "").trim();

  if (!name) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Name wajib diisi." },
        { status: 400 },
      ),
    };
  }

  return { ok: true as const, name };
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const serviceRoleClient = createServiceRoleClient();
    const { data, error } = await serviceRoleClient
      .from("location_tags")
      .select("id, name")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { items: (data ?? []).map((row) => mapLocationTagRow(row)) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get location tags error:", error);
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

    const payload = parsePayload((await request.json()) as { name?: string });
    if (!payload.ok) {
      return payload.response;
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data: existing, error: checkError } = await serviceRoleClient
      .from("location_tags")
      .select("id")
      .eq("name", payload.name)
      .maybeSingle();

    if (checkError) {
      return NextResponse.json(
        { message: checkError.message },
        { status: 400 },
      );
    }

    if (existing) {
      return NextResponse.json(
        { message: "Location tag sudah ada." },
        { status: 400 },
      );
    }

    const { data, error } = await serviceRoleClient
      .from("location_tags")
      .insert({ name: payload.name })
      .select("id, name")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: "Location tag berhasil ditambahkan.",
        item: mapLocationTagRow(data),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create location tag error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan data." },
      { status: 500 },
    );
  }
}
