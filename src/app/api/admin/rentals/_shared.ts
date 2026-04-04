import { createServiceRoleClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "media";

type RentalRow = {
  id: number;
  uuid: string | null;
  code: string | null;
  name: string | null;
  description: string | null;
  price: number | null;
  specifications: Record<string, unknown> | null;
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

type RentalItemCategoryPivotRow = {
  rental_id: number;
  item_category_id: number;
};

type RentalItemSubCategoryPivotRow = {
  rental_id: number;
  item_sub_category_id: number;
};

type RentalImageRow = {
  id: number;
  rental_id: number;
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

export type RentalPayload = {
  name: string;
  description: string;
  price: number;
  is_available: boolean;
  specifications: Record<string, string>;
  item_category_ids: number[];
  item_sub_category_ids: number[];
  images: Array<{
    url: string;
    position: number;
  }>;
};

function parseSpecifications(value: unknown): Record<string, string> {
  if (Array.isArray(value)) {
    return value.reduce<Record<string, string>>((acc, row) => {
      const item = (row ?? {}) as { key?: unknown; value?: unknown };
      const key = String(item.key ?? "").trim();
      const val = String(item.value ?? "").trim();
      if (key) {
        acc[key] = val;
      }
      return acc;
    }, {});
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<
      Record<string, string>
    >((acc, [key, val]) => {
      const normalizedKey = String(key ?? "").trim();
      if (!normalizedKey) return acc;
      acc[normalizedKey] = String(val ?? "").trim();
      return acc;
    }, {});
  }

  return {};
}

export function parseRentalPayload(
  payload: unknown,
): { ok: true; data: RentalPayload } | { ok: false; message: string } {
  const source = (payload ?? {}) as Partial<RentalPayload>;
  const sourceWithSpecifications = source as Partial<RentalPayload> & {
    specifications?: unknown;
  };

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
    if (!Array.isArray(value)) return [] as RentalPayload["images"];

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
    return { ok: false, message: "Nama rental wajib diisi." };
  }

  if (!description) {
    return { ok: false, message: "Deskripsi rental wajib diisi." };
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
      specifications: parseSpecifications(
        sourceWithSpecifications.specifications,
      ),
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

function formatRentalCode(baseCode: string, number: number) {
  return `${baseCode}-${String(number).padStart(4, "0")}`;
}

export async function generateRentalCode(
  payload: Pick<RentalPayload, "item_category_ids" | "item_sub_category_ids">,
  options?: { excludeRentalId?: number },
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
  const baseCode = `DR-RT-${categoryPart}-${subCategoryPart}`;

  if (Number.isInteger(options?.excludeRentalId)) {
    const currentRentalResult = await serviceRoleClient
      .from("rentals")
      .select("code")
      .eq("id", options?.excludeRentalId)
      .maybeSingle();

    if (currentRentalResult.error) {
      throw new Error(currentRentalResult.error.message);
    }

    const currentCode = String(currentRentalResult.data?.code ?? "").trim();
    if (currentCode.startsWith(`${baseCode}-`)) {
      const suffix = currentCode.slice(`${baseCode}-`.length);
      if (/^\d+$/.test(suffix)) {
        return formatRentalCode(baseCode, Number(suffix));
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

  return formatRentalCode(baseCode, nextNumber);
}

export async function syncRentalRelations(
  rentalId: number,
  payload: RentalPayload,
) {
  const serviceRoleClient = createServiceRoleClient();

  const [deleteCategory, deleteSubCategory, deleteImages] = await Promise.all([
    serviceRoleClient
      .from("rental_item_category")
      .delete()
      .eq("rental_id", rentalId),
    serviceRoleClient
      .from("rental_item_sub_category")
      .delete()
      .eq("rental_id", rentalId),
    serviceRoleClient.from("rental_images").delete().eq("rental_id", rentalId),
  ]);

  const deleteError =
    deleteCategory.error || deleteSubCategory.error || deleteImages.error;

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (payload.item_category_ids.length > 0) {
    const insertCategory = await serviceRoleClient
      .from("rental_item_category")
      .insert(
        payload.item_category_ids.map((itemCategoryId) => ({
          rental_id: rentalId,
          item_category_id: itemCategoryId,
        })),
      );

    if (insertCategory.error) {
      throw new Error(insertCategory.error.message);
    }
  }

  if (payload.item_sub_category_ids.length > 0) {
    const insertSubCategory = await serviceRoleClient
      .from("rental_item_sub_category")
      .insert(
        payload.item_sub_category_ids.map((itemSubCategoryId) => ({
          rental_id: rentalId,
          item_sub_category_id: itemSubCategoryId,
        })),
      );

    if (insertSubCategory.error) {
      throw new Error(insertSubCategory.error.message);
    }
  }

  if (payload.images.length > 0) {
    const insertImages = await serviceRoleClient.from("rental_images").insert(
      payload.images.map((image) => ({
        rental_id: rentalId,
        url: image.url,
        position: image.position,
      })),
    );

    if (insertImages.error) {
      throw new Error(insertImages.error.message);
    }
  }
}

export async function listRentalsWithRelations() {
  const serviceRoleClient = createServiceRoleClient();

  const rentalsResult = await serviceRoleClient
    .from("rentals")
    .select(
      "id, uuid, code, name, description, price, specifications, is_available, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (rentalsResult.error) {
    throw new Error(rentalsResult.error.message);
  }

  const rentals = (rentalsResult.data ?? []) as RentalRow[];
  if (rentals.length === 0) {
    return [];
  }

  const rentalIds = rentals.map((item) => item.id);

  const [categoryPivotResult, subCategoryPivotResult, imagesResult] =
    await Promise.all([
      serviceRoleClient
        .from("rental_item_category")
        .select("rental_id, item_category_id")
        .in("rental_id", rentalIds),
      serviceRoleClient
        .from("rental_item_sub_category")
        .select("rental_id, item_sub_category_id")
        .in("rental_id", rentalIds),
      serviceRoleClient
        .from("rental_images")
        .select("id, rental_id, url, position")
        .in("rental_id", rentalIds)
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
    []) as RentalItemCategoryPivotRow[];
  const subCategoryPivots = (subCategoryPivotResult.data ??
    []) as RentalItemSubCategoryPivotRow[];
  const rentalImages = (imagesResult.data ?? []) as RentalImageRow[];

  const imagePaths = Array.from(
    new Set(
      rentalImages
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

  return rentals.map((rental) => {
    const selectedCategoryIds = categoryPivots
      .filter((row) => row.rental_id === rental.id)
      .map((row) => row.item_category_id);

    const selectedSubCategoryIds = subCategoryPivots
      .filter((row) => row.rental_id === rental.id)
      .map((row) => row.item_sub_category_id);

    return {
      ...rental,
      uuid: String(rental.uuid ?? ""),
      code: String(rental.code ?? ""),
      name: String(rental.name ?? ""),
      description: String(rental.description ?? ""),
      price: Number(rental.price ?? 0),
      specifications: parseSpecifications(rental.specifications),
      is_available: Boolean(rental.is_available ?? true),
      item_category_ids: selectedCategoryIds,
      item_sub_category_ids: selectedSubCategoryIds,
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
      images: rentalImages
        .filter((row) => row.rental_id === rental.id)
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
