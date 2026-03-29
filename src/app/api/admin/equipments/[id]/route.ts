import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Equipment, Profile } from "@/types";

type EquipmentRow = {
  equipment_id?: string;
  id?: string;
  name?: string;
  description?: string;
  price?: number | string | null;
  specs?: Equipment["specs"];
  images?: string[] | null;
  created_at?: string;
};

type EquipmentPayload = {
  name: string;
  description: string;
  price: number;
  specs: Equipment["specs"];
  images: string[];
};

const STORAGE_BUCKET = "shooting_locations";
const STORAGE_FOLDER = "equipments";

type ServiceRoleClient = ReturnType<typeof createServiceRoleClient>;

function mapEquipmentRow(row: EquipmentRow): Equipment {
  return {
    equipment_id: row.equipment_id ?? row.id ?? "",
    name: row.name ?? "",
    description: row.description ?? "",
    price:
      typeof row.price === "number"
        ? row.price
        : Number.parseInt(String(row.price ?? 0), 10) || 0,
    specs:
      row.specs && typeof row.specs === "object"
        ? row.specs
        : ({} as Equipment["specs"]),
    images: Array.isArray(row.images)
      ? row.images.filter((img) => typeof img === "string")
      : [],
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
): { ok: true; value: Equipment["specs"] } | { ok: false } {
  if (typeof value !== "string") {
    return { ok: false };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { ok: false };
  }

  try {
    const parsed = JSON.parse(trimmed) as Equipment["specs"];
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

function parseExistingImageUrls(
  value: FormDataEntryValue,
): { ok: true; value: string[] } | { ok: false } {
  if (typeof value !== "string") {
    return { ok: false };
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false };
    }

    const normalized = parsed
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);

    return { ok: true, value: normalized };
  } catch {
    return { ok: false };
  }
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

function isMissingColumnError(errorMessage: string, column: string) {
  const normalized = errorMessage.toLowerCase();
  return (
    normalized.includes(`column \"${column.toLowerCase()}\"`) &&
    normalized.includes("does not exist")
  );
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
    .eq("user_id", user.id)
    .single<Pick<Profile, "role">>();

  if (profileError || profile?.role !== "admin") {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true as const };
}

async function findEquipmentById(serviceRoleClient: ServiceRoleClient, id: string) {
  const idColumns = ["equipment_id", "id"];
  let latestErrorMessage = "";

  for (const idColumn of idColumns) {
    const result = await serviceRoleClient
      .from("equipments")
      .select("*")
      .eq(idColumn, id)
      .maybeSingle();

    if (!result.error) {
      if (result.data) {
        return { row: result.data as EquipmentRow, errorMessage: "" };
      }
      continue;
    }

    const message = String(result.error.message || "");
    latestErrorMessage = message;

    if (isMissingColumnError(message, idColumn)) {
      continue;
    }

    return { row: null, errorMessage: latestErrorMessage };
  }

  return { row: null, errorMessage: latestErrorMessage };
}

async function updateEquipmentById(
  serviceRoleClient: ServiceRoleClient,
  id: string,
  payload: EquipmentPayload,
) {
  const idColumns = ["equipment_id", "id"];
  let latestErrorMessage = "";

  for (const idColumn of idColumns) {
    const result = await serviceRoleClient
      .from("equipments")
      .update(payload)
      .eq(idColumn, id)
      .select("*")
      .maybeSingle();

    if (!result.error) {
      if (result.data) {
        return { updated: result.data as EquipmentRow, errorMessage: "" };
      }
      continue;
    }

    const message = String(result.error.message || "");
    latestErrorMessage = message;

    if (isMissingColumnError(message, idColumn)) {
      continue;
    }

    return { updated: null, errorMessage: latestErrorMessage };
  }

  return { updated: null, errorMessage: latestErrorMessage };
}

async function deleteEquipmentById(
  serviceRoleClient: ServiceRoleClient,
  id: string,
) {
  const idColumns = ["equipment_id", "id"];
  let latestErrorMessage = "";

  for (const idColumn of idColumns) {
    const result = await serviceRoleClient
      .from("equipments")
      .delete()
      .eq(idColumn, id)
      .select("*")
      .maybeSingle();

    if (!result.error) {
      if (result.data) {
        return { deleted: result.data as EquipmentRow, errorMessage: "" };
      }
      continue;
    }

    const message = String(result.error.message || "");
    latestErrorMessage = message;

    if (isMissingColumnError(message, idColumn)) {
      continue;
    }

    return { deleted: null, errorMessage: latestErrorMessage };
  }

  return { deleted: null, errorMessage: latestErrorMessage };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "ID equipment tidak valid." },
        { status: 400 },
      );
    }

    const formData = await request.formData();

    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const price = parsePrice(formData.get("price"));
    const specsResult = parseJsonField(formData.get("specs"));

    if (!name) {
      return NextResponse.json(
        { message: "Nama equipment wajib diisi." },
        { status: 400 },
      );
    }

    if (!description) {
      return NextResponse.json(
        { message: "Deskripsi equipment wajib diisi." },
        { status: 400 },
      );
    }

    if (price === null) {
      return NextResponse.json(
        { message: "Harga harus berupa bilangan bulat >= 0." },
        { status: 400 },
      );
    }

    if (!specsResult.ok) {
      return NextResponse.json(
        { message: "Specs harus berupa JSON object atau array yang valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const existingEquipmentResult = await findEquipmentById(serviceRoleClient, id);

    if (existingEquipmentResult.errorMessage) {
      return NextResponse.json(
        { message: existingEquipmentResult.errorMessage },
        { status: 400 },
      );
    }

    if (!existingEquipmentResult.row) {
      return NextResponse.json(
        { message: "Equipment tidak ditemukan." },
        { status: 404 },
      );
    }

    const oldImageUrls = Array.isArray(existingEquipmentResult.row.images)
      ? existingEquipmentResult.row.images.filter((img) => typeof img === "string")
      : [];

    let existingImageUrls = oldImageUrls;

    const existingImageUrlsEntry = formData.get("existingImageUrls");
    if (existingImageUrlsEntry !== null) {
      const parsedExistingImageUrls = parseExistingImageUrls(existingImageUrlsEntry);

      if (!parsedExistingImageUrls.ok) {
        return NextResponse.json(
          { message: "existingImageUrls tidak valid." },
          { status: 400 },
        );
      }

      existingImageUrls = parsedExistingImageUrls.value;
    }

    const imageFiles = parseImageFiles(formData);
    const uploadResult = await uploadImageFiles(serviceRoleClient, imageFiles);

    if (!uploadResult.ok) {
      return NextResponse.json({ message: uploadResult.message }, { status: 400 });
    }

    const finalImages = [...existingImageUrls, ...uploadResult.urls];

    if (finalImages.length === 0) {
      await removeStoredImages(serviceRoleClient, uploadResult.urls);
      return NextResponse.json(
        { message: "Minimal harus ada 1 gambar equipment." },
        { status: 400 },
      );
    }

    const { updated, errorMessage } = await updateEquipmentById(
      serviceRoleClient,
      id,
      {
        name,
        description,
        price,
        specs: specsResult.value,
        images: finalImages,
      },
    );

    if (errorMessage) {
      await removeStoredImages(serviceRoleClient, uploadResult.urls);
      return NextResponse.json({ message: errorMessage }, { status: 400 });
    }

    if (!updated) {
      await removeStoredImages(serviceRoleClient, uploadResult.urls);
      return NextResponse.json(
        { message: "Equipment tidak ditemukan." },
        { status: 404 },
      );
    }

    const deletedImageUrls = oldImageUrls.filter(
      (imageUrl) => !existingImageUrls.includes(imageUrl),
    );
    await removeStoredImages(serviceRoleClient, deletedImageUrls);

    return NextResponse.json(
      {
        message: "Equipment berhasil diupdate.",
        equipment: mapEquipmentRow(updated),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update admin equipment error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate equipment." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "ID equipment tidak valid." },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const existingEquipmentResult = await findEquipmentById(serviceRoleClient, id);

    if (existingEquipmentResult.errorMessage) {
      return NextResponse.json(
        { message: existingEquipmentResult.errorMessage },
        { status: 400 },
      );
    }

    if (!existingEquipmentResult.row) {
      return NextResponse.json(
        { message: "Equipment tidak ditemukan." },
        { status: 404 },
      );
    }

    const { deleted, errorMessage } = await deleteEquipmentById(
      serviceRoleClient,
      id,
    );

    if (errorMessage) {
      return NextResponse.json({ message: errorMessage }, { status: 400 });
    }

    if (!deleted) {
      return NextResponse.json(
        { message: "Equipment tidak ditemukan." },
        { status: 404 },
      );
    }

    const oldImageUrls = Array.isArray(existingEquipmentResult.row.images)
      ? existingEquipmentResult.row.images.filter((img) => typeof img === "string")
      : [];

    await removeStoredImages(serviceRoleClient, oldImageUrls);

    return NextResponse.json(
      { message: "Equipment berhasil dihapus." },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete admin equipment error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus equipment." },
      { status: 500 },
    );
  }
}
