import { createServiceRoleClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "media";

type CrewRow = {
  id: number;
  uuid: string | null;
  code: string | null;
  name: string | null;
  description: string | null;
  price: number | null;
  is_available: boolean | null;
  created_at: string | null;
  updated_at: string | null;
};

type ItemCategoryRow = {
  id: number;
  name: string | null;
  short_code: string | null;
};

type ItemSubCategoryRow = {
  id: number;
  name: string | null;
  short_code: string | null;
};

type CrewItemCategoryPivotRow = {
  crew_id: number;
  item_category_id: number;
};

type CrewItemSubCategoryPivotRow = {
  crew_id: number;
  item_sub_category_id: number;
};

type CrewImageRow = {
  id: number;
  crew_id: number;
  url: string;
  position: number | null;
};

type SignedUrlRow = {
  signedUrl?: string;
  error?: string;
};

type CodeCounterRow = {
  prefix_code: string;
  last_number: number | null;
};

export type CrewPayload = {
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  item_category_ids: number[];
  item_sub_category_ids: number[];
  images: Array<{
    url: string;
    position: number;
  }>;
};

export function parseCrewPayload(
  payload: unknown,
): { ok: true; data: CrewPayload } | { ok: false; message: string } {
  const source = (payload ?? {}) as Partial<CrewPayload>;

  const toNumber = (value: unknown, fallback: number = 0) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const toIntArray = (value: unknown) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry));
  };

  const toSingleIntArray = (value: unknown) => {
    const values = toIntArray(value);
    if (values.length === 0) return [];
    return [values[0]];
  };

  const toImages = (value: unknown) => {
    if (!Array.isArray(value)) return [] as CrewPayload["images"];

    return value
      .map((entry, index) => {
        const item = (entry ?? {}) as { url?: unknown; position?: unknown };
        return {
          url: String(item.url ?? "").trim(),
          position: Math.max(1, Math.trunc(toNumber(item.position, index + 1))),
        };
      })
      .filter((entry) => entry.url.length > 0)
      .sort((a, b) => a.position - b.position)
      .map((entry, index) => ({
        url: entry.url,
        position: index + 1,
      }));
  };

  const name = String(source.name ?? "").trim();
  const description = String(source.description ?? "").trim();
  const price = toNumber(source.price, 0);

  if (!name) {
    return { ok: false, message: "Nama crew wajib diisi." };
  }

  if (!description) {
    return { ok: false, message: "Deskripsi crew wajib diisi." };
  }

  if (price < 0) {
    return { ok: false, message: "Harga harus berupa angka >= 0." };
  }

  return {
    ok: true,
    data: {
      name,
      description,
      price,
      is_available: Boolean(source.is_available ?? true),
      item_category_ids: toSingleIntArray(source.item_category_ids),
      item_sub_category_ids: toSingleIntArray(source.item_sub_category_ids),
      images: toImages((source as { images?: unknown }).images),
    },
  };
}

function normalizeCodeSegment(code: string | null | undefined) {
  const normalized = String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return normalized || "NA";
}

function buildCodePart(codes: Array<string | null | undefined>) {
  const segments = Array.from(new Set(codes.map(normalizeCodeSegment)));
  return segments.length > 0 ? segments.join("") : "NA";
}

function formatCrewCode(baseCode: string, number: number) {
  return `${baseCode}-${String(number).padStart(4, "0")}`;
}

export async function generateCrewCode(
  payload: Pick<CrewPayload, "item_category_ids" | "item_sub_category_ids">,
  options?: { excludeCrewId?: number },
) {
  const serviceRoleClient = createServiceRoleClient();

  const [categoriesResult, subCategoriesResult] = await Promise.all([
    payload.item_category_ids.length > 0
      ? serviceRoleClient
          .from("item_categories")
          .select("id, short_code")
          .in("id", payload.item_category_ids)
      : Promise.resolve({ data: [], error: null }),
    payload.item_sub_category_ids.length > 0
      ? serviceRoleClient
          .from("item_sub_categories")
          .select("id, short_code")
          .in("id", payload.item_sub_category_ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  if (subCategoriesResult.error) {
    throw new Error(subCategoriesResult.error.message);
  }

  const categoryCodes = (
    (categoriesResult.data ?? []) as ItemCategoryRow[]
  ).map((row) => row.short_code);
  const subCategoryCodes = (
    (subCategoriesResult.data ?? []) as ItemSubCategoryRow[]
  ).map((row) => row.short_code);

  const categoryPart = buildCodePart(categoryCodes);
  const subCategoryPart = buildCodePart(subCategoryCodes);
  const baseCode = `DS-CR-${categoryPart}-${subCategoryPart}`;

  if (Number.isInteger(options?.excludeCrewId)) {
    const currentCrewResult = await serviceRoleClient
      .from("crews")
      .select("code")
      .eq("id", options?.excludeCrewId)
      .maybeSingle();

    if (currentCrewResult.error) {
      throw new Error(currentCrewResult.error.message);
    }

    const currentCode = String(currentCrewResult.data?.code ?? "").trim();
    if (currentCode.startsWith(`${baseCode}-`)) {
      const suffix = currentCode.slice(`${baseCode}-`.length);
      if (/^\d+$/.test(suffix)) {
        return formatCrewCode(baseCode, Number(suffix));
      }
      return currentCode;
    }
  }

  const counterResult = await serviceRoleClient
    .from("code_counter")
    .select("prefix_code, last_number")
    .eq("prefix_code", baseCode)
    .maybeSingle();

  if (counterResult.error) {
    throw new Error(counterResult.error.message);
  }

  const existingCounter = (counterResult.data ?? null) as CodeCounterRow | null;
  const nextNumber = existingCounter
    ? Math.max(1, Number(existingCounter.last_number ?? 0) + 1)
    : 1;

  if (!existingCounter) {
    const insertCounterResult = await serviceRoleClient
      .from("code_counter")
      .insert({
        prefix_code: baseCode,
        last_number: nextNumber,
      });

    if (insertCounterResult.error) {
      throw new Error(insertCounterResult.error.message);
    }
  } else {
    const updateCounterResult = await serviceRoleClient
      .from("code_counter")
      .update({
        last_number: nextNumber,
      })
      .eq("prefix_code", baseCode);

    if (updateCounterResult.error) {
      throw new Error(updateCounterResult.error.message);
    }
  }

  return formatCrewCode(baseCode, nextNumber);
}

export async function syncCrewRelations(crewId: number, payload: CrewPayload) {
  const serviceRoleClient = createServiceRoleClient();

  const [deleteCategory, deleteSubCategory, deleteImages] = await Promise.all([
    serviceRoleClient.from("crew_item_category").delete().eq("crew_id", crewId),
    serviceRoleClient
      .from("crew_item_sub_category")
      .delete()
      .eq("crew_id", crewId),
    serviceRoleClient.from("crew_images").delete().eq("crew_id", crewId),
  ]);

  const deleteError =
    deleteCategory.error || deleteSubCategory.error || deleteImages.error;

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (payload.item_category_ids.length > 0) {
    const insertCategory = await serviceRoleClient
      .from("crew_item_category")
      .insert(
        payload.item_category_ids.map((itemCategoryId) => ({
          crew_id: crewId,
          item_category_id: itemCategoryId,
        })),
      );

    if (insertCategory.error) {
      throw new Error(insertCategory.error.message);
    }
  }

  if (payload.item_sub_category_ids.length > 0) {
    const insertSubCategory = await serviceRoleClient
      .from("crew_item_sub_category")
      .insert(
        payload.item_sub_category_ids.map((itemSubCategoryId) => ({
          crew_id: crewId,
          item_sub_category_id: itemSubCategoryId,
        })),
      );

    if (insertSubCategory.error) {
      throw new Error(insertSubCategory.error.message);
    }
  }

  if (payload.images.length > 0) {
    const insertImages = await serviceRoleClient.from("crew_images").insert(
      payload.images.map((image) => ({
        crew_id: crewId,
        url: image.url,
        position: image.position,
      })),
    );

    if (insertImages.error) {
      throw new Error(insertImages.error.message);
    }
  }
}

export async function listCrewsWithRelations() {
  const serviceRoleClient = createServiceRoleClient();

  const crewsResult = await serviceRoleClient
    .from("crews")
    .select(
      "id, uuid, code, name, description, price, is_available, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (crewsResult.error) {
    throw new Error(crewsResult.error.message);
  }

  const crews = (crewsResult.data ?? []) as CrewRow[];
  if (crews.length === 0) {
    return [];
  }

  const crewIds = crews.map((item) => item.id);

  const [categoryPivotResult, subCategoryPivotResult, imagesResult] =
    await Promise.all([
      serviceRoleClient
        .from("crew_item_category")
        .select("crew_id, item_category_id")
        .in("crew_id", crewIds),
      serviceRoleClient
        .from("crew_item_sub_category")
        .select("crew_id, item_sub_category_id")
        .in("crew_id", crewIds),
      serviceRoleClient
        .from("crew_images")
        .select("id, crew_id, url, position")
        .in("crew_id", crewIds)
        .order("position", { ascending: true }),
    ]);

  if (categoryPivotResult.error) {
    throw new Error(categoryPivotResult.error.message);
  }
  if (subCategoryPivotResult.error) {
    throw new Error(subCategoryPivotResult.error.message);
  }
  if (imagesResult.error) {
    throw new Error(imagesResult.error.message);
  }

  const categoryPivots = (categoryPivotResult.data ??
    []) as CrewItemCategoryPivotRow[];
  const subCategoryPivots = (subCategoryPivotResult.data ??
    []) as CrewItemSubCategoryPivotRow[];
  const crewImages = (imagesResult.data ?? []) as CrewImageRow[];

  const imagePaths = Array.from(
    new Set(
      crewImages
        .map((row) => String(row.url ?? "").trim())
        .filter((path) => path.length > 0),
    ),
  );

  const signedUrlMap = new Map<string, string>();
  if (imagePaths.length > 0) {
    const signedResult = await serviceRoleClient.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(imagePaths, 60 * 60);

    if (!signedResult.error) {
      (signedResult.data ?? []).forEach((item, index) => {
        const row = item as SignedUrlRow;
        if (!row.error && row.signedUrl) {
          signedUrlMap.set(imagePaths[index], row.signedUrl);
        }
      });
    }
  }

  const categoryIds = [
    ...new Set(categoryPivots.map((row) => row.item_category_id)),
  ];
  const subCategoryIds = [
    ...new Set(subCategoryPivots.map((row) => row.item_sub_category_id)),
  ];

  const [categoriesResult, subCategoriesResult] = await Promise.all([
    categoryIds.length > 0
      ? serviceRoleClient
          .from("item_categories")
          .select("id, name, short_code")
          .in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    subCategoryIds.length > 0
      ? serviceRoleClient
          .from("item_sub_categories")
          .select("id, name, short_code")
          .in("id", subCategoryIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }
  if (subCategoriesResult.error) {
    throw new Error(subCategoriesResult.error.message);
  }

  const categoryMap = new Map<number, ItemCategoryRow>();
  const subCategoryMap = new Map<number, ItemSubCategoryRow>();
  ((categoriesResult.data ?? []) as ItemCategoryRow[]).forEach((row) => {
    categoryMap.set(row.id, row);
  });
  ((subCategoriesResult.data ?? []) as ItemSubCategoryRow[]).forEach((row) => {
    subCategoryMap.set(row.id, row);
  });

  return crews.map((crew) => {
    const selectedCategoryIds = categoryPivots
      .filter((row) => row.crew_id === crew.id)
      .map((row) => row.item_category_id);

    const selectedSubCategoryIds = subCategoryPivots
      .filter((row) => row.crew_id === crew.id)
      .map((row) => row.item_sub_category_id);

    return {
      ...crew,
      uuid: String(crew.uuid ?? ""),
      code: String(crew.code ?? ""),
      name: String(crew.name ?? ""),
      description: String(crew.description ?? ""),
      price: Number(crew.price ?? 0),
      is_available: Boolean(crew.is_available ?? true),
      skill_ids: [],
      item_category_ids: selectedCategoryIds,
      item_sub_category_ids: selectedSubCategoryIds,
      skills: [],
      item_categories: selectedCategoryIds
        .map((id) => categoryMap.get(id))
        .filter(Boolean)
        .map((item) => ({
          id: item!.id,
          name: String(item!.name ?? ""),
          short_code: String(item!.short_code ?? ""),
        })),
      item_sub_categories: selectedSubCategoryIds
        .map((id) => subCategoryMap.get(id))
        .filter(Boolean)
        .map((item) => ({
          id: item!.id,
          name: String(item!.name ?? ""),
          short_code: String(item!.short_code ?? ""),
        })),
      images: crewImages
        .filter((row) => row.crew_id === crew.id)
        .sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0))
        .map((row, index) => ({
          id: row.id,
          url: row.url,
          preview_url: signedUrlMap.get(row.url) ?? null,
          position: Number(row.position ?? index + 1),
        })),
    };
  });
}
