import { createServiceRoleClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "media";

type BundleRow = {
  id: number;
  uuid: string | null;
  code: string | null;
  name: string | null;
  description: string | null;
  is_active: boolean | null;
  base_price: number | null;
  discount_type: string | null;
  discount_value: number | null;
  final_price: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type BundleTypeRow = {
  id: number;
  name: string | null;
  short_code: string | null;
};

type BundleCategoryRow = {
  id: number;
  name: string | null;
  short_code: string | null;
};

type BundleTypePivotRow = {
  bundle_id: number;
  bundle_type_id: number;
};

type BundleCategoryPivotRow = {
  bundle_id: number;
  bundle_category_id: number;
};

type BundleCrewRow = {
  bundle_id: number;
  crew_id: number;
  quantity: number | null;
  notes: string | null;
};

type BundleRentalRow = {
  bundle_id: number;
  rental_id: number;
  quantity: number | null;
  notes: string | null;
};

type BundleFoodAndBeverageRow = {
  bundle_id: number;
  food_and_beverage_id: number;
  quantity: number | null;
  notes: string | null;
};

type BundleExpendableRow = {
  bundle_id: number;
  expendable_id: number;
  quantity: number | null;
  notes: string | null;
};

type BundleImageRow = {
  id: number;
  bundle_id: number;
  url: string;
  position: number | null;
};

type ItemRow = {
  id: number;
  name: string | null;
  price: number | null;
};

type SignedUrlRow = {
  signedUrl?: string;
  error?: string;
};

type CodeCounterRow = {
  prefix_code: string;
  last_number: number | null;
};

export type BundleItemPayload = {
  quantity: number;
  notes: string;
};

export type BundlePayload = {
  name: string;
  description: string;
  is_active: boolean;
  discount_type: "percent" | "fixed" | null;
  discount_value: number;
  bundle_type_ids: number[];
  bundle_category_ids: number[];
  crews: Array<BundleItemPayload & { crew_id: number }>;
  rentals: Array<BundleItemPayload & { rental_id: number }>;
  food_and_beverages: Array<
    BundleItemPayload & { food_and_beverage_id: number }
  >;
  expendables: Array<BundleItemPayload & { expendable_id: number }>;
  images: Array<{ url: string; position: number }>;
};

function toNumber(value: unknown, fallback: number = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toSingleIntArray(value: unknown) {
  if (!Array.isArray(value)) return [] as number[];
  const values = value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isInteger(entry));
  if (values.length === 0) return [];
  return [values[0]];
}

function parseItemRows<T extends string>(
  value: unknown,
  key: T,
): Array<BundleItemPayload & Record<T, number>> {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const itemId = Number(row[key]);
      const quantity = Math.max(1, Math.trunc(toNumber(row.quantity, 1)));
      const notes = String(row.notes ?? "").trim();
      return {
        [key]: itemId,
        quantity,
        notes,
      } as BundleItemPayload & Record<T, number>;
    })
    .filter((entry) => Number.isInteger(entry[key]))
    .filter(
      (entry, index, array) =>
        array.findIndex((item) => item[key] === entry[key]) === index,
    );
}

function parseImages(value: unknown) {
  if (!Array.isArray(value)) return [] as BundlePayload["images"];

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
}

export function parseBundlePayload(
  payload: unknown,
): { ok: true; data: BundlePayload } | { ok: false; message: string } {
  const source = (payload ?? {}) as Partial<BundlePayload>;

  const name = String(source.name ?? "").trim();
  const description = String(source.description ?? "").trim();
  const discountTypeRaw = String(source.discount_type ?? "")
    .trim()
    .toLowerCase();
  const discountType =
    discountTypeRaw === "percent" || discountTypeRaw === "fixed"
      ? (discountTypeRaw as "percent" | "fixed")
      : null;
  const discountValue = Math.max(
    0,
    Math.trunc(toNumber(source.discount_value, 0)),
  );

  if (!name) {
    return { ok: false, message: "Nama bundle wajib diisi." };
  }

  return {
    ok: true,
    data: {
      name,
      description,
      is_active: Boolean(source.is_active ?? true),
      discount_type: discountType,
      discount_value: discountValue,
      bundle_type_ids: toSingleIntArray(source.bundle_type_ids),
      bundle_category_ids: toSingleIntArray(source.bundle_category_ids),
      crews: parseItemRows(source.crews, "crew_id"),
      rentals: parseItemRows(source.rentals, "rental_id"),
      food_and_beverages: parseItemRows(
        source.food_and_beverages,
        "food_and_beverage_id",
      ),
      expendables: parseItemRows(source.expendables, "expendable_id"),
      images: parseImages((source as { images?: unknown }).images),
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

function formatBundleCode(baseCode: string, number: number) {
  return `${baseCode}-${String(number).padStart(4, "0")}`;
}

export async function generateBundleCode(
  payload: Pick<BundlePayload, "bundle_type_ids" | "bundle_category_ids">,
  options?: { excludeBundleId?: number },
) {
  const serviceRoleClient = createServiceRoleClient();

  const [typeResult, categoryResult] = await Promise.all([
    payload.bundle_type_ids.length > 0
      ? serviceRoleClient
          .from("bundle_types")
          .select("id, short_code")
          .in("id", payload.bundle_type_ids)
      : Promise.resolve({ data: [], error: null }),
    payload.bundle_category_ids.length > 0
      ? serviceRoleClient
          .from("bundle_categories")
          .select("id, short_code")
          .in("id", payload.bundle_category_ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (typeResult.error) {
    throw new Error(typeResult.error.message);
  }

  if (categoryResult.error) {
    throw new Error(categoryResult.error.message);
  }

  const typeCode = normalizeCodeSegment(
    ((typeResult.data ?? []) as Array<{ short_code?: string | null }>)[0]
      ?.short_code,
  );
  const categoryCode = normalizeCodeSegment(
    ((categoryResult.data ?? []) as Array<{ short_code?: string | null }>)[0]
      ?.short_code,
  );

  const baseCode = `DS-${typeCode}-${categoryCode}`;

  if (Number.isInteger(options?.excludeBundleId)) {
    const currentBundleResult = await serviceRoleClient
      .from("bundles")
      .select("code")
      .eq("id", options?.excludeBundleId)
      .maybeSingle();

    if (!currentBundleResult.error) {
      const currentCode = String(
        (currentBundleResult.data as { code?: string | null } | null)?.code ??
          "",
      ).trim();
      if (currentCode.startsWith(`${baseCode}-`)) {
        const suffix = currentCode.slice(`${baseCode}-`.length);
        if (/^\d+$/.test(suffix)) {
          return formatBundleCode(baseCode, Number(suffix));
        }
      }
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
      .update({ last_number: nextNumber })
      .eq("prefix_code", baseCode);

    if (updateCounterResult.error) {
      throw new Error(updateCounterResult.error.message);
    }
  }

  return formatBundleCode(baseCode, nextNumber);
}

export async function getBundleItemPriceMaps(payload: BundlePayload) {
  const serviceRoleClient = createServiceRoleClient();

  const crewIds = payload.crews.map((item) => item.crew_id);
  const rentalIds = payload.rentals.map((item) => item.rental_id);
  const foodIds = payload.food_and_beverages.map(
    (item) => item.food_and_beverage_id,
  );
  const expendableIds = payload.expendables.map((item) => item.expendable_id);

  const [crewResult, rentalResult, foodResult, expendableResult] =
    await Promise.all([
      crewIds.length > 0
        ? serviceRoleClient.from("crews").select("id, price").in("id", crewIds)
        : Promise.resolve({ data: [], error: null }),
      rentalIds.length > 0
        ? serviceRoleClient
            .from("rentals")
            .select("id, price")
            .in("id", rentalIds)
        : Promise.resolve({ data: [], error: null }),
      foodIds.length > 0
        ? serviceRoleClient
            .from("food_and_beverage")
            .select("id, price")
            .in("id", foodIds)
        : Promise.resolve({ data: [], error: null }),
      expendableIds.length > 0
        ? serviceRoleClient
            .from("expendables")
            .select("id, price")
            .in("id", expendableIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  const errors = [
    crewResult.error,
    rentalResult.error,
    foodResult.error,
    expendableResult.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors[0]?.message || "Gagal mengambil harga item bundle.");
  }

  const toMap = (rows: Array<{ id: number; price: number | null }>) => {
    const map = new Map<number, number>();
    rows.forEach((row) => map.set(Number(row.id), Number(row.price ?? 0)));
    return map;
  };

  return {
    crewPriceMap: toMap(
      (crewResult.data ?? []) as Array<{ id: number; price: number | null }>,
    ),
    rentalPriceMap: toMap(
      (rentalResult.data ?? []) as Array<{ id: number; price: number | null }>,
    ),
    foodPriceMap: toMap(
      (foodResult.data ?? []) as Array<{ id: number; price: number | null }>,
    ),
    expendablePriceMap: toMap(
      (expendableResult.data ?? []) as Array<{
        id: number;
        price: number | null;
      }>,
    ),
  };
}

export function calculateBundlePrices(
  payload: BundlePayload,
  priceMaps: {
    crewPriceMap: Map<number, number>;
    rentalPriceMap: Map<number, number>;
    foodPriceMap: Map<number, number>;
    expendablePriceMap: Map<number, number>;
  },
) {
  const sumLine = <T extends { quantity: number }>(
    rows: T[],
    getPrice: (row: T) => number,
  ) =>
    rows.reduce(
      (acc, row) =>
        acc + Math.max(0, getPrice(row)) * Math.max(1, row.quantity),
      0,
    );

  const basePrice =
    sumLine(
      payload.crews,
      (item) => priceMaps.crewPriceMap.get(item.crew_id) ?? 0,
    ) +
    sumLine(
      payload.rentals,
      (item) => priceMaps.rentalPriceMap.get(item.rental_id) ?? 0,
    ) +
    sumLine(
      payload.food_and_beverages,
      (item) => priceMaps.foodPriceMap.get(item.food_and_beverage_id) ?? 0,
    ) +
    sumLine(
      payload.expendables,
      (item) => priceMaps.expendablePriceMap.get(item.expendable_id) ?? 0,
    );

  const normalizedDiscountValue = Math.max(
    0,
    Math.trunc(payload.discount_value),
  );

  let finalPrice = basePrice;
  if (payload.discount_type === "percent") {
    const percent = Math.min(100, normalizedDiscountValue);
    finalPrice = Math.max(
      0,
      basePrice - Math.floor((basePrice * percent) / 100),
    );
  } else if (payload.discount_type === "fixed") {
    finalPrice = Math.max(0, basePrice - normalizedDiscountValue);
  }

  return {
    basePrice,
    finalPrice,
    discountValue: normalizedDiscountValue,
    discountType: payload.discount_type,
  };
}

export async function syncBundleRelations(
  bundleId: number,
  payload: BundlePayload,
) {
  const serviceRoleClient = createServiceRoleClient();

  const [
    deleteType,
    deleteCategory,
    deleteCrew,
    deleteRental,
    deleteFood,
    deleteExpendable,
    deleteImage,
  ] = await Promise.all([
    serviceRoleClient.from("bundle_type").delete().eq("bundle_id", bundleId),
    serviceRoleClient
      .from("bundle_category")
      .delete()
      .eq("bundle_id", bundleId),
    serviceRoleClient.from("bundle_crews").delete().eq("bundle_id", bundleId),
    serviceRoleClient.from("bundle_rentals").delete().eq("bundle_id", bundleId),
    serviceRoleClient
      .from("bundle_food_and_beverage")
      .delete()
      .eq("bundle_id", bundleId),
    serviceRoleClient
      .from("bundle_expendables")
      .delete()
      .eq("bundle_id", bundleId),
    serviceRoleClient.from("bundle_images").delete().eq("bundle_id", bundleId),
  ]);

  const deleteError = [
    deleteType.error,
    deleteCategory.error,
    deleteCrew.error,
    deleteRental.error,
    deleteFood.error,
    deleteExpendable.error,
    deleteImage.error,
  ].find(Boolean);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (payload.bundle_type_ids.length > 0) {
    const insertType = await serviceRoleClient.from("bundle_type").insert(
      payload.bundle_type_ids.map((bundleTypeId) => ({
        bundle_id: bundleId,
        bundle_type_id: bundleTypeId,
      })),
    );
    if (insertType.error) throw new Error(insertType.error.message);
  }

  if (payload.bundle_category_ids.length > 0) {
    const insertCategory = await serviceRoleClient
      .from("bundle_category")
      .insert(
        payload.bundle_category_ids.map((bundleCategoryId) => ({
          bundle_id: bundleId,
          bundle_category_id: bundleCategoryId,
        })),
      );
    if (insertCategory.error) throw new Error(insertCategory.error.message);
  }

  if (payload.crews.length > 0) {
    const insertCrew = await serviceRoleClient.from("bundle_crews").insert(
      payload.crews.map((item) => ({
        uuid: crypto.randomUUID(),
        bundle_id: bundleId,
        crew_id: item.crew_id,
        quantity: item.quantity,
        notes: item.notes || null,
      })),
    );
    if (insertCrew.error) throw new Error(insertCrew.error.message);
  }

  if (payload.rentals.length > 0) {
    const insertRental = await serviceRoleClient.from("bundle_rentals").insert(
      payload.rentals.map((item) => ({
        uuid: crypto.randomUUID(),
        bundle_id: bundleId,
        rental_id: item.rental_id,
        quantity: item.quantity,
        notes: item.notes || null,
      })),
    );
    if (insertRental.error) throw new Error(insertRental.error.message);
  }

  if (payload.food_and_beverages.length > 0) {
    const insertFood = await serviceRoleClient
      .from("bundle_food_and_beverage")
      .insert(
        payload.food_and_beverages.map((item) => ({
          uuid: crypto.randomUUID(),
          bundle_id: bundleId,
          food_and_beverage_id: item.food_and_beverage_id,
          quantity: item.quantity,
          notes: item.notes || null,
        })),
      );
    if (insertFood.error) throw new Error(insertFood.error.message);
  }

  if (payload.expendables.length > 0) {
    const insertExpendable = await serviceRoleClient
      .from("bundle_expendables")
      .insert(
        payload.expendables.map((item) => ({
          uuid: crypto.randomUUID(),
          bundle_id: bundleId,
          expendable_id: item.expendable_id,
          quantity: item.quantity,
          notes: item.notes || null,
        })),
      );
    if (insertExpendable.error) throw new Error(insertExpendable.error.message);
  }

  if (payload.images.length > 0) {
    const insertImages = await serviceRoleClient.from("bundle_images").insert(
      payload.images.map((image) => ({
        bundle_id: bundleId,
        url: image.url,
        position: image.position,
      })),
    );
    if (insertImages.error) throw new Error(insertImages.error.message);
  }
}

export async function listBundlesWithRelations() {
  const serviceRoleClient = createServiceRoleClient();

  const bundlesResult = await serviceRoleClient
    .from("bundles")
    .select(
      "id, uuid, code, name, description, is_active, base_price, discount_type, discount_value, final_price, created_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (bundlesResult.error) {
    throw new Error(bundlesResult.error.message);
  }

  const bundles = (bundlesResult.data ?? []) as BundleRow[];
  if (bundles.length === 0) {
    return [];
  }

  const bundleIds = bundles.map((item) => item.id);

  const [
    typePivotResult,
    categoryPivotResult,
    crewPivotResult,
    rentalPivotResult,
    foodPivotResult,
    expendablePivotResult,
    imageResult,
  ] = await Promise.all([
    serviceRoleClient
      .from("bundle_type")
      .select("bundle_id, bundle_type_id")
      .in("bundle_id", bundleIds),
    serviceRoleClient
      .from("bundle_category")
      .select("bundle_id, bundle_category_id")
      .in("bundle_id", bundleIds),
    serviceRoleClient
      .from("bundle_crews")
      .select("bundle_id, crew_id, quantity, notes")
      .in("bundle_id", bundleIds),
    serviceRoleClient
      .from("bundle_rentals")
      .select("bundle_id, rental_id, quantity, notes")
      .in("bundle_id", bundleIds),
    serviceRoleClient
      .from("bundle_food_and_beverage")
      .select("bundle_id, food_and_beverage_id, quantity, notes")
      .in("bundle_id", bundleIds),
    serviceRoleClient
      .from("bundle_expendables")
      .select("bundle_id, expendable_id, quantity, notes")
      .in("bundle_id", bundleIds),
    serviceRoleClient
      .from("bundle_images")
      .select("id, bundle_id, url, position")
      .in("bundle_id", bundleIds)
      .order("position", { ascending: true }),
  ]);

  const relationError = [
    typePivotResult.error,
    categoryPivotResult.error,
    crewPivotResult.error,
    rentalPivotResult.error,
    foodPivotResult.error,
    expendablePivotResult.error,
    imageResult.error,
  ].find(Boolean);

  if (relationError) {
    throw new Error(relationError.message);
  }

  const typePivots = (typePivotResult.data ?? []) as BundleTypePivotRow[];
  const categoryPivots = (categoryPivotResult.data ??
    []) as BundleCategoryPivotRow[];
  const crewPivots = (crewPivotResult.data ?? []) as BundleCrewRow[];
  const rentalPivots = (rentalPivotResult.data ?? []) as BundleRentalRow[];
  const foodPivots = (foodPivotResult.data ?? []) as BundleFoodAndBeverageRow[];
  const expendablePivots = (expendablePivotResult.data ??
    []) as BundleExpendableRow[];
  const bundleImages = (imageResult.data ?? []) as BundleImageRow[];

  const typeIds = [...new Set(typePivots.map((row) => row.bundle_type_id))];
  const categoryIds = [
    ...new Set(categoryPivots.map((row) => row.bundle_category_id)),
  ];
  const crewIds = [...new Set(crewPivots.map((row) => row.crew_id))];
  const rentalIds = [...new Set(rentalPivots.map((row) => row.rental_id))];
  const foodIds = [
    ...new Set(foodPivots.map((row) => row.food_and_beverage_id)),
  ];
  const expendableIds = [
    ...new Set(expendablePivots.map((row) => row.expendable_id)),
  ];

  const [
    typeResult,
    categoryResult,
    crewResult,
    rentalResult,
    foodResult,
    expendableResult,
  ] = await Promise.all([
    typeIds.length > 0
      ? serviceRoleClient
          .from("bundle_types")
          .select("id, name, short_code")
          .in("id", typeIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length > 0
      ? serviceRoleClient
          .from("bundle_categories")
          .select("id, name, short_code")
          .in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    crewIds.length > 0
      ? serviceRoleClient
          .from("crews")
          .select("id, name, price")
          .in("id", crewIds)
      : Promise.resolve({ data: [], error: null }),
    rentalIds.length > 0
      ? serviceRoleClient
          .from("rentals")
          .select("id, name, price")
          .in("id", rentalIds)
      : Promise.resolve({ data: [], error: null }),
    foodIds.length > 0
      ? serviceRoleClient
          .from("food_and_beverage")
          .select("id, name, price")
          .in("id", foodIds)
      : Promise.resolve({ data: [], error: null }),
    expendableIds.length > 0
      ? serviceRoleClient
          .from("expendables")
          .select("id, name, price")
          .in("id", expendableIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const optionError = [
    typeResult.error,
    categoryResult.error,
    crewResult.error,
    rentalResult.error,
    foodResult.error,
    expendableResult.error,
  ].find(Boolean);

  if (optionError) {
    throw new Error(optionError.message);
  }

  const typeMap = new Map<number, BundleTypeRow>();
  const categoryMap = new Map<number, BundleCategoryRow>();
  const crewMap = new Map<number, ItemRow>();
  const rentalMap = new Map<number, ItemRow>();
  const foodMap = new Map<number, ItemRow>();
  const expendableMap = new Map<number, ItemRow>();

  ((typeResult.data ?? []) as BundleTypeRow[]).forEach((row) =>
    typeMap.set(row.id, row),
  );
  ((categoryResult.data ?? []) as BundleCategoryRow[]).forEach((row) =>
    categoryMap.set(row.id, row),
  );
  ((crewResult.data ?? []) as ItemRow[]).forEach((row) =>
    crewMap.set(row.id, row),
  );
  ((rentalResult.data ?? []) as ItemRow[]).forEach((row) =>
    rentalMap.set(row.id, row),
  );
  ((foodResult.data ?? []) as ItemRow[]).forEach((row) =>
    foodMap.set(row.id, row),
  );
  ((expendableResult.data ?? []) as ItemRow[]).forEach((row) =>
    expendableMap.set(row.id, row),
  );

  const imagePaths = Array.from(
    new Set(
      bundleImages
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

  return bundles.map((bundle) => {
    const selectedTypeIds = typePivots
      .filter((row) => row.bundle_id === bundle.id)
      .map((row) => row.bundle_type_id);

    const selectedCategoryIds = categoryPivots
      .filter((row) => row.bundle_id === bundle.id)
      .map((row) => row.bundle_category_id);

    const crews = crewPivots
      .filter((row) => row.bundle_id === bundle.id)
      .map((row) => {
        const detail = crewMap.get(row.crew_id);
        const quantity = Math.max(1, Number(row.quantity ?? 1));
        const price = Number(detail?.price ?? 0);
        return {
          crew_id: row.crew_id,
          name: String(detail?.name ?? ""),
          quantity,
          notes: String(row.notes ?? ""),
          unit_price: price,
          subtotal: quantity * price,
        };
      });

    const rentals = rentalPivots
      .filter((row) => row.bundle_id === bundle.id)
      .map((row) => {
        const detail = rentalMap.get(row.rental_id);
        const quantity = Math.max(1, Number(row.quantity ?? 1));
        const price = Number(detail?.price ?? 0);
        return {
          rental_id: row.rental_id,
          name: String(detail?.name ?? ""),
          quantity,
          notes: String(row.notes ?? ""),
          unit_price: price,
          subtotal: quantity * price,
        };
      });

    const foodAndBeverages = foodPivots
      .filter((row) => row.bundle_id === bundle.id)
      .map((row) => {
        const detail = foodMap.get(row.food_and_beverage_id);
        const quantity = Math.max(1, Number(row.quantity ?? 1));
        const price = Number(detail?.price ?? 0);
        return {
          food_and_beverage_id: row.food_and_beverage_id,
          name: String(detail?.name ?? ""),
          quantity,
          notes: String(row.notes ?? ""),
          unit_price: price,
          subtotal: quantity * price,
        };
      });

    const expendables = expendablePivots
      .filter((row) => row.bundle_id === bundle.id)
      .map((row) => {
        const detail = expendableMap.get(row.expendable_id);
        const quantity = Math.max(1, Number(row.quantity ?? 1));
        const price = Number(detail?.price ?? 0);
        return {
          expendable_id: row.expendable_id,
          name: String(detail?.name ?? ""),
          quantity,
          notes: String(row.notes ?? ""),
          unit_price: price,
          subtotal: quantity * price,
        };
      });

    return {
      id: bundle.id,
      uuid: String(bundle.uuid ?? ""),
      code: String(bundle.code ?? ""),
      name: String(bundle.name ?? ""),
      description: String(bundle.description ?? ""),
      is_active: Boolean(bundle.is_active ?? true),
      base_price: Number(bundle.base_price ?? 0),
      discount_type: String(bundle.discount_type ?? ""),
      discount_value: Number(bundle.discount_value ?? 0),
      final_price: Number(bundle.final_price ?? 0),
      bundle_type_ids: selectedTypeIds,
      bundle_category_ids: selectedCategoryIds,
      bundle_types: selectedTypeIds
        .map((id) => typeMap.get(id))
        .filter(Boolean)
        .map((item) => ({
          id: item!.id,
          name: String(item!.name ?? ""),
          short_code: String(item!.short_code ?? ""),
        })),
      bundle_categories: selectedCategoryIds
        .map((id) => categoryMap.get(id))
        .filter(Boolean)
        .map((item) => ({
          id: item!.id,
          name: String(item!.name ?? ""),
          short_code: String(item!.short_code ?? ""),
        })),
      crews,
      rentals,
      food_and_beverages: foodAndBeverages,
      expendables,
      images: bundleImages
        .filter((row) => row.bundle_id === bundle.id)
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
