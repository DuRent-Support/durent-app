import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export type MasterDataRow = {
  id?: string | number | null;
  name?: string | null;
  short_code?: string | null;
  created_at?: string | null;
};

type CountConfig = {
  tables: string[];
  foreignKey: string;
};

type PayloadResult =
  | { ok: true; name: string; shortCode: string }
  | { ok: false; response: NextResponse };

export function mapMasterDataRow(row: MasterDataRow) {
  return {
    id: String(row.id ?? ""),
    name: String(row.name ?? ""),
    short_code: String(row.short_code ?? ""),
    items: 0,
  };
}

export async function requireAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_uuid", user.id)
    .single<Pick<Profile, "role">>();

  if (profileError || profile?.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

async function parsePayload(request: Request): Promise<PayloadResult> {
  const payload = (await request.json()) as {
    name?: string;
    short_code?: string;
  };

  const name = String(payload.name ?? "").trim();
  const shortCode = String(payload.short_code ?? "").trim();

  if (!name) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Nama wajib diisi." },
        { status: 400 },
      ),
    };
  }

  if (!shortCode) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Short code wajib diisi." },
        { status: 400 },
      ),
    };
  }

  return { ok: true, name, shortCode };
}

async function buildCountMap(
  serviceRoleClient: ReturnType<typeof createServiceRoleClient>,
  countConfig: CountConfig,
): Promise<Map<number, number>> {
  const countMap = new Map<number, number>();
  const results = await Promise.all(
    countConfig.tables.map((t) =>
      serviceRoleClient.from(t).select(countConfig.foreignKey),
    ),
  );
  for (const result of results) {
    if (result.error || !result.data) continue;
    for (const row of result.data as unknown as Record<string, unknown>[]) {
      const id = Number(row[countConfig.foreignKey]);
      if (!Number.isFinite(id)) continue;
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    }
  }
  return countMap;
}

export async function listMasterData(table: string, countConfig?: CountConfig) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const serviceRoleClient = createServiceRoleClient();

    const orderedResult = await serviceRoleClient
      .from(table)
      .select("id, name, short_code, created_at")
      .order("created_at", { ascending: false });

    let rows = orderedResult.data as MasterDataRow[] | null;

    if (orderedResult.error) {
      const message = String(orderedResult.error.message || "").toLowerCase();
      const createdAtMissing =
        message.includes('column "created_at"') &&
        message.includes("does not exist");

      if (!createdAtMissing) {
        return NextResponse.json(
          { message: orderedResult.error.message },
          { status: 400 },
        );
      }

      const fallbackResult = await serviceRoleClient
        .from(table)
        .select("id, name, short_code, created_at");

      if (fallbackResult.error) {
        return NextResponse.json(
          { message: fallbackResult.error.message },
          { status: 400 },
        );
      }

      rows = fallbackResult.data as MasterDataRow[] | null;
    }

    const countMap = countConfig
      ? await buildCountMap(serviceRoleClient, countConfig)
      : null;

    return NextResponse.json(
      {
        items: (rows ?? []).map((row) => ({
          ...mapMasterDataRow(row),
          items: countMap ? (countMap.get(Number(row.id)) ?? 0) : 0,
        })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get master data error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data." },
      { status: 500 },
    );
  }
}

export async function createMasterData(table: string, request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const payload = await parsePayload(request);
    if (!payload.ok) {
      return payload.response;
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data, error } = await serviceRoleClient
      .from(table)
      .insert({
        name: payload.name,
        short_code: payload.shortCode,
      })
      .select("id, name, short_code, created_at")
      .single();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: "Data berhasil ditambahkan.",
        item: mapMasterDataRow(data as MasterDataRow),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create master data error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan data." },
      { status: 500 },
    );
  }
}

export async function updateMasterData(
  table: string,
  id: string,
  request: Request,
) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const payload = await parsePayload(request);
    if (!payload.ok) {
      return payload.response;
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data, error } = await serviceRoleClient
      .from(table)
      .update({
        name: payload.name,
        short_code: payload.shortCode,
      })
      .eq("id", id)
      .select("id, name, short_code, created_at")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Data tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Data berhasil diupdate.",
        item: mapMasterDataRow(data as MasterDataRow),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update master data error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate data." },
      { status: 500 },
    );
  }
}

export async function removeMasterData(table: string, id: string) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data, error } = await serviceRoleClient
      .from(table)
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    if (!data) {
      return NextResponse.json(
        { message: "Data tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Data berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete master data error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus data." },
      { status: 500 },
    );
  }
}
