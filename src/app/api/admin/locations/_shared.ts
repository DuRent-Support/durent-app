import { createServiceRoleClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "media";

type LocationRow = {
  id: number;
  uuid: string;
  code: string;
  name: string;
  description: string | null;
  city: string | null;
  price: number | null;
  area: number | null;
  pax: number | null;
  is_available: boolean | null;
  rating: number | null;
  updated_at: string | null;
};

type PivotTagRow = {
  location_id: number;
  location_tag_id: number;
};

type PivotItemCategoryRow = {
  location_id: number;
  item_category_id: number;
};

type PivotItemSubCategoryRow = {
  location_id: number;
  item_sub_category_id: number;
};

type LocationImageRow = {
  id: number;
  location_id: number;
  url: string;
  position: number | null;
};

type SignedUrlRow = {
  signedUrl?: string;
  path?: string;
  error?: string;
};

type TagRow = {
  id: number;
  name: string;
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

type CodeCounterRow = {
  prefix_code: string;
  last_number: number | null;
};

export type LocationPayload = {
  name: string;
  description: string;
  city: string;
  price: number;
  area: number;
  pax: number;
  is_available: boolean;
  tag_ids: number[];
  item_category_ids: number[];
  item_sub_category_ids: number[];
  images: Array<{
    url: string;
    position: number;
  }>;
};

export function parseLocationPayload(
  payload: unknown,
): { ok: true; data: LocationPayload } | { ok: false; message: string } {
  const source = (payload ?? {}) as Partial<LocationPayload>;

  const name = String(source.name ?? "").trim();

  if (!name) {
    return { ok: false, message: "Name wajib diisi." };
  }

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

  const toImages = (value: unknown) => {
    if (!Array.isArray(value)) return [] as LocationPayload["images"];

    const parsed = value
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

    return parsed;
  };

  return {
    ok: true,
    data: {
      name,
      description: String(source.description ?? "").trim(),
      city: String(source.city ?? "").trim(),
      price: toNumber(source.price, 0),
      area: toNumber(source.area, 0),
      pax: Math.max(0, Math.trunc(toNumber(source.pax, 0))),
      is_available: Boolean(source.is_available ?? true),
      tag_ids: toIntArray(source.tag_ids),
      item_category_ids: toIntArray(source.item_category_ids),
      item_sub_category_ids: toIntArray(source.item_sub_category_ids),
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

function formatLocationCode(baseCode: string, number: number) {
  return `${baseCode}-${String(number).padStart(4, "0")}`;
}

export async function generateLocationCode(
  payload: Pick<LocationPayload, "item_category_ids" | "item_sub_category_ids">,
  options?: { excludeLocationId?: number },
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
  const baseCode = `DR-LC-${categoryPart}-${subCategoryPart}`;

  if (Number.isInteger(options?.excludeLocationId)) {
    const currentLocationResult = await serviceRoleClient
      .from("locations")
      .select("code")
      .eq("id", options?.excludeLocationId)
      .maybeSingle();

    if (currentLocationResult.error) {
      throw new Error(currentLocationResult.error.message);
    }

    const currentCode = String(currentLocationResult.data?.code ?? "").trim();
    if (currentCode.startsWith(`${baseCode}-`)) {
      const suffix = currentCode.slice(`${baseCode}-`.length);
      if (/^\d+$/.test(suffix)) {
        return formatLocationCode(baseCode, Number(suffix));
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

  return formatLocationCode(baseCode, nextNumber);
}

export async function syncLocationRelations(
  locationId: number,
  payload: LocationPayload,
) {
  const serviceRoleClient = createServiceRoleClient();

  const deleteTagResult = await serviceRoleClient
    .from("location_tag")
    .delete()
    .eq("location_id", locationId);

  if (deleteTagResult.error) {
    throw new Error(deleteTagResult.error.message);
  }

  const deleteCategoryResult = await serviceRoleClient
    .from("location_item_category")
    .delete()
    .eq("location_id", locationId);

  if (deleteCategoryResult.error) {
    throw new Error(deleteCategoryResult.error.message);
  }

  const deleteSubCategoryResult = await serviceRoleClient
    .from("location_item_sub_category")
    .delete()
    .eq("location_id", locationId);

  if (deleteSubCategoryResult.error) {
    throw new Error(deleteSubCategoryResult.error.message);
  }

  if (payload.tag_ids.length > 0) {
    const insertTagResult = await serviceRoleClient.from("location_tag").insert(
      payload.tag_ids.map((tagId) => ({
        location_id: locationId,
        location_tag_id: tagId,
      })),
    );

    if (insertTagResult.error) {
      throw new Error(insertTagResult.error.message);
    }
  }

  if (payload.item_category_ids.length > 0) {
    const insertCategoryResult = await serviceRoleClient
      .from("location_item_category")
      .insert(
        payload.item_category_ids.map((itemCategoryId) => ({
          location_id: locationId,
          item_category_id: itemCategoryId,
        })),
      );

    if (insertCategoryResult.error) {
      throw new Error(insertCategoryResult.error.message);
    }
  }

  if (payload.item_sub_category_ids.length > 0) {
    const insertSubCategoryResult = await serviceRoleClient
      .from("location_item_sub_category")
      .insert(
        payload.item_sub_category_ids.map((itemSubCategoryId) => ({
          location_id: locationId,
          item_sub_category_id: itemSubCategoryId,
        })),
      );

    if (insertSubCategoryResult.error) {
      throw new Error(insertSubCategoryResult.error.message);
    }
  }

  const deleteImagesResult = await serviceRoleClient
    .from("location_images")
    .delete()
    .eq("location_id", locationId);

  if (deleteImagesResult.error) {
    throw new Error(deleteImagesResult.error.message);
  }

  if (payload.images.length > 0) {
    const insertImagesResult = await serviceRoleClient
      .from("location_images")
      .insert(
        payload.images.map((image) => ({
          location_id: locationId,
          url: image.url,
          position: image.position,
        })),
      );

    if (insertImagesResult.error) {
      throw new Error(insertImagesResult.error.message);
    }
  }
}

export async function listLocationsWithRelations() {
  const serviceRoleClient = createServiceRoleClient();

  const { data: locations, error: locationError } = await serviceRoleClient
    .from("locations")
    .select(
      "id, uuid, code, name, description, city, price, area, pax, is_available, rating, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (locationError) {
    throw new Error(locationError.message);
  }

  const locationRows = (locations ?? []) as LocationRow[];
  if (locationRows.length === 0) {
    return [];
  }

  const locationIds = locationRows.map((row) => row.id);

  const [
    tagPivotResult,
    categoryPivotResult,
    subCategoryPivotResult,
    imagesResult,
  ] = await Promise.all([
    serviceRoleClient
      .from("location_tag")
      .select("location_id, location_tag_id")
      .in("location_id", locationIds),
    serviceRoleClient
      .from("location_item_category")
      .select("location_id, item_category_id")
      .in("location_id", locationIds),
    serviceRoleClient
      .from("location_item_sub_category")
      .select("location_id, item_sub_category_id")
      .in("location_id", locationIds),
    serviceRoleClient
      .from("location_images")
      .select("id, location_id, url, position")
      .in("location_id", locationIds)
      .order("position", { ascending: true }),
  ]);

  if (tagPivotResult.error) {
    throw new Error(tagPivotResult.error.message);
  }

  if (categoryPivotResult.error) {
    throw new Error(categoryPivotResult.error.message);
  }

  if (subCategoryPivotResult.error) {
    throw new Error(subCategoryPivotResult.error.message);
  }

  if (imagesResult.error) {
    throw new Error(imagesResult.error.message);
  }

  const tagPivots = (tagPivotResult.data ?? []) as PivotTagRow[];
  const categoryPivots = (categoryPivotResult.data ??
    []) as PivotItemCategoryRow[];
  const subCategoryPivots = (subCategoryPivotResult.data ??
    []) as PivotItemSubCategoryRow[];
  const locationImages = (imagesResult.data ?? []) as LocationImageRow[];

  const imagePaths = Array.from(
    new Set(
      locationImages
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

  const tagIds = [...new Set(tagPivots.map((row) => row.location_tag_id))];
  const categoryIds = [
    ...new Set(categoryPivots.map((row) => row.item_category_id)),
  ];
  const subCategoryIds = [
    ...new Set(subCategoryPivots.map((row) => row.item_sub_category_id)),
  ];

  const [tagsResult, categoriesResult, subCategoriesResult] = await Promise.all(
    [
      tagIds.length > 0
        ? serviceRoleClient
            .from("location_tags")
            .select("id, name")
            .in("id", tagIds)
        : Promise.resolve({ data: [], error: null }),
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
    ],
  );

  if (tagsResult.error) {
    throw new Error(tagsResult.error.message);
  }

  if (categoriesResult.error) {
    throw new Error(categoriesResult.error.message);
  }

  if (subCategoriesResult.error) {
    throw new Error(subCategoriesResult.error.message);
  }

  const tagMap = new Map<number, TagRow>();
  const categoryMap = new Map<number, ItemCategoryRow>();
  const subCategoryMap = new Map<number, ItemSubCategoryRow>();

  ((tagsResult.data ?? []) as TagRow[]).forEach((row) =>
    tagMap.set(row.id, row),
  );
  ((categoriesResult.data ?? []) as ItemCategoryRow[]).forEach((row) =>
    categoryMap.set(row.id, row),
  );
  ((subCategoriesResult.data ?? []) as ItemSubCategoryRow[]).forEach((row) =>
    subCategoryMap.set(row.id, row),
  );

  return locationRows.map((location) => {
    const selectedTagIds = tagPivots
      .filter((row) => row.location_id === location.id)
      .map((row) => row.location_tag_id);

    const selectedCategoryIds = categoryPivots
      .filter((row) => row.location_id === location.id)
      .map((row) => row.item_category_id);

    const selectedSubCategoryIds = subCategoryPivots
      .filter((row) => row.location_id === location.id)
      .map((row) => row.item_sub_category_id);

    return {
      ...location,
      tag_ids: selectedTagIds,
      item_category_ids: selectedCategoryIds,
      item_sub_category_ids: selectedSubCategoryIds,
      tags: selectedTagIds
        .map((id) => tagMap.get(id))
        .filter(Boolean)
        .map((item) => ({ id: item!.id, name: item!.name })),
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
      images: locationImages
        .filter((row) => row.location_id === location.id)
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
