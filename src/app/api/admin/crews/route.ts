import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Crew, Profile } from "@/types";

type CrewRow = {
  crew_id?: string;
  id?: string;
  name?: string;
  description?: string;
  images?: string[] | null;
  price?: number | string | null;
  skills?: Crew["skills"];
  created_at?: string;
};

const STORAGE_BUCKET = "shooting_locations";
const STORAGE_FOLDER = "crews";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

function mapCrewRow(row: CrewRow): Crew {
  return {
    crew_id: row.crew_id ?? row.id ?? "",
    name: row.name ?? "",
    description: row.description ?? "",
    images: Array.isArray(row.images)
      ? row.images.filter((img) => typeof img === "string")
      : [],
    price:
      typeof row.price === "number"
        ? row.price
        : Number.parseInt(String(row.price ?? 0), 10) || 0,
    skills:
      row.skills && typeof row.skills === "object"
        ? row.skills
        : ({} as Crew["skills"]),
    created_at: row.created_at,
  };
}

function parsePrice(value: FormDataEntryValue | null): number | null {
  const parsed = Number.parseInt(String(value ?? ""), 10);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseJsonField(
  value: FormDataEntryValue | null,
): { ok: true; value: Crew["skills"] } | { ok: false } {
  if (typeof value !== "string") {
    return { ok: false };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false };
  }

  try {
    const parsed = JSON.parse(trimmed) as Crew["skills"];
    if (parsed === null || typeof parsed !== "object") {
      return { ok: false };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false };
  }
}

function parseImageFiles(formData: FormData): File[] {
  const imageFiles: File[] = [];
  let index = 0;

  while (formData.has(`image_${index}`)) {
    const file = formData.get(`image_${index}`);
    if (file instanceof File && file.size > 0) {
      imageFiles.push(file);
    }
    index++;
  }

  return imageFiles;
}

function extractStoragePathFromUrl(imageUrl: string): string {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const markerIndex = imageUrl.indexOf(marker);

  if (markerIndex >= 0) {
    return decodeURIComponent(
      imageUrl.slice(markerIndex + marker.length).split("?")[0],
    );
  }

  return imageUrl.split("/").slice(-2).join("/");
}

async function removeStoredImages(
  serviceRoleClient: ServiceRoleClient,
  imageUrls: string[],
) {
  if (imageUrls.length === 0) return;

  const storagePaths = imageUrls
    .map((imageUrl) => extractStoragePathFromUrl(imageUrl))
    .filter((path) => path.length > 0);

  if (storagePaths.length === 0) return;

  await serviceRoleClient.storage.from(STORAGE_BUCKET).remove(storagePaths);
}

async function uploadImageFiles(
  serviceRoleClient: ServiceRoleClient,
  imageFiles: File[],
): Promise<{ ok: true; urls: string[] } | { ok: false; message: string }> {
  const uploadedUrls: string[] = [];

  for (const imageFile of imageFiles) {
    const fileExt = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${STORAGE_FOLDER}/${fileName}`;

    const { error: uploadError } = await serviceRoleClient.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, imageFile, {
        contentType: imageFile.type,
        upsert: false,
      });

    if (uploadError) {
      await removeStoredImages(serviceRoleClient, uploadedUrls);
      return { ok: false, message: `Upload error: ${uploadError.message}` };
    }

    const {
      data: { publicUrl },
    } = serviceRoleClient.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

    uploadedUrls.push(publicUrl);
  }

  return { ok: true, urls: uploadedUrls };
}

async function requireAdmin() {
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

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const serviceRoleClient = createServiceRoleClient();

    const orderedResult = await serviceRoleClient
      .from("crews")
      .select("*")
      .order("created_at", { ascending: false });

    let rows = orderedResult.data as CrewRow[] | null;

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

      const fallbackResult = await serviceRoleClient.from("crews").select("*");

      if (fallbackResult.error) {
        return NextResponse.json(
          { message: fallbackResult.error.message },
          { status: 400 },
        );
      }

      rows = fallbackResult.data as CrewRow[] | null;
    }

    return NextResponse.json(
      { crews: (rows ?? []).map((row) => mapCrewRow(row)) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Get admin crews error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data crew." },
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

    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const price = parsePrice(formData.get("price"));
    const skillsResult = parseJsonField(formData.get("skills"));
    const imageFiles = parseImageFiles(formData);

    if (!name) {
      return NextResponse.json(
        { message: "Nama crew wajib diisi." },
        { status: 400 },
      );
    }

    if (!description) {
      return NextResponse.json(
        { message: "Deskripsi crew wajib diisi." },
        { status: 400 },
      );
    }

    if (price === null) {
      return NextResponse.json(
        { message: "Harga harus berupa bilangan bulat >= 0." },
        { status: 400 },
      );
    }

    if (!skillsResult.ok) {
      return NextResponse.json(
        { message: "Skills harus berupa JSON object atau array yang valid." },
        { status: 400 },
      );
    }

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { message: "Minimal upload 1 gambar crew." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();
    const uploadResult = await uploadImageFiles(serviceRoleClient, imageFiles);

    if (!uploadResult.ok) {
      return NextResponse.json(
        { message: uploadResult.message },
        { status: 400 },
      );
    }

    const { data, error } = await serviceRoleClient
      .from("crews")
      .insert({
        name,
        description,
        images: uploadResult.urls,
        price,
        skills: skillsResult.value,
      })
      .select("*")
      .single();

    if (error) {
      await removeStoredImages(serviceRoleClient, uploadResult.urls);
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        message: "Crew berhasil ditambahkan.",
        crew: mapCrewRow(data as CrewRow),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin crew error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan crew." },
      { status: 500 },
    );
  }
}
