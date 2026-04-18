import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "../_shared";

type BundleCodeItem = {
  code: string;
  quantity: number;
};

type BundleSeedRow = {
  code: string;
  name: string;
  description: string;
  base_price?: number;
  discount_type?: "percent" | "fixed" | null;
  discount_value?: number;
  final_price?: number;
  is_active?: boolean;
  code_items: BundleCodeItem[];
};

type ItemType = "crew" | "rental" | "expendable" | "fnb" | "location";

type CodeLookup = {
  type: ItemType;
  id: number;
};

const bundleRows: BundleSeedRow[] = [
  {
    code: "DS-BI-PU-0001",
    name: "Shooting Package",
    description: "Paket hemat untuk kebutuhan produksi dasar.",
    base_price: 0,
    discount_type: "percent",
    discount_value: 10,
    final_price: 0,
    code_items: [
      { code: "DS-RT-PU-KS-0003", quantity: 5 },
      { code: "DS-RT-PU-KS-0002", quantity: 5 },
      { code: "DS-RT-PU-KS-0001", quantity: 12 },
      { code: "DS-RT-PU-MJ-0002", quantity: 2 },
      { code: "DS-RT-PU-MJ-0001", quantity: 2 },
      { code: "DS-RT-PU-KA-0001", quantity: 2 },
      { code: "DS-RT-ET-KT-0001", quantity: 3 },
      { code: "DS-RT-ET-KR-0001", quantity: 1 },
      { code: "DS-RT-PU-CB-0002", quantity: 1 },
      { code: "DS-RT-PU-DG-0002", quantity: 1 },
      { code: "DS-RT-PU-TD-0001", quantity: 1 },
      { code: "DS-RT-PU-TB-0002", quantity: 1 },
    ],
  },
  {
    code: "DS-BI-CM-0001",
    name: "HT WLN KD C1 Package (10 Pcs)",
    description: "Paket hemat untuk kebutuhan produksi dasar.",
    base_price: 0,
    discount_type: "percent",
    discount_value: 10,
    final_price: 0,
    code_items: [{ code: "DS-RT-CM-HT-0001", quantity: 10 }],
  },
  {
    code: "DS-BI-CM-0002",
    name: "HT WLN KD C1 Package (20 Pcs)",
    description: "Paket hemat untuk kebutuhan produksi dasar.",
    base_price: 0,
    discount_type: "percent",
    discount_value: 10,
    final_price: 0,
    code_items: [{ code: "DS-RT-CM-HT-0001", quantity: 20 }],
  },
  {
    code: "DS-BI-CM-0003",
    name: "HT WLN KD C1 Package (40 Pcs)",
    description: "Paket hemat untuk kebutuhan produksi dasar.",
    base_price: 0,
    discount_type: "percent",
    discount_value: 10,
    final_price: 0,
    code_items: [{ code: "DS-RT-CM-HT-0001", quantity: 40 }],
  },
  {
    code: "DS-BI-PU-0002",
    name: "Meja Lipat 122 Cm + Table Cover",
    description: "Paket hemat untuk kebutuhan produksi dasar.",
    base_price: 0,
    discount_type: "percent",
    discount_value: 10,
    final_price: 0,
    code_items: [
      { code: "DS-RT-PU-MJ-0001", quantity: 10 },
      { code: "DS-RT-AO-TC-0001", quantity: 10 },
    ],
  },
  {
    code: "DS-BI-PU-0003",
    name: "Meja Lipat 182 Cm + Table Cover",
    description: "Paket hemat untuk kebutuhan produksi dasar.",
    base_price: 0,
    discount_type: "percent",
    discount_value: 10,
    final_price: 0,
    code_items: [
      { code: "DS-RT-PU-MJ-0003", quantity: 1 },
      { code: "DS-RT-AO-TC-0001", quantity: 1 },
    ],
  },
  {
    code: "DS-BI-PU-0004",
    name: "Meja Lipat 180 Cm Portable + Table Cover",
    description: "Paket hemat untuk kebutuhan produksi dasar.",
    base_price: 0,
    discount_type: "percent",
    discount_value: 10,
    final_price: 0,
    code_items: [
      { code: "DS-RT-PU-MJ-0002", quantity: 1 },
      { code: "DS-RT-AO-TC-0001", quantity: 1 },
    ],
  },
  {
    code: "DS-BI-CW-0001",
    name: "Production Crew (UPM)",
    description: "Paket hemat untuk kebutuhan produksi dasar.",
    base_price: 0,
    discount_type: "percent",
    discount_value: 10,
    final_price: 0,
    code_items: [{ code: "DS-CW-UPM-0001", quantity: 10 }],
  },
];

function getItemTypeFromCode(code: string): ItemType | null {
  if (code.startsWith("DS-CW-")) return "crew";
  if (code.startsWith("DS-RT-")) return "rental";
  if (code.startsWith("DS-ED-")) return "expendable";
  if (code.startsWith("DS-FB-")) return "fnb";
  if (code.startsWith("DS-LC-")) return "location";
  return null;
}

function calcBasePrice(
  items: BundleCodeItem[],
  priceLookup: Map<string, number>,
) {
  return items.reduce((total, item) => {
    const price = priceLookup.get(item.code);
    if (!price) return total;
    return total + price * item.quantity;
  }, 0);
}

function calcFinalPrice(
  basePrice: number,
  discountType?: BundleSeedRow["discount_type"],
  discountValue?: number,
) {
  if (!discountType || !discountValue) return basePrice;

  if (discountType === "percent") {
    const discount = Math.round((basePrice * discountValue) / 100);
    return Math.max(basePrice - discount, 0);
  }

  if (discountType === "fixed") {
    return Math.max(basePrice - discountValue, 0);
  }

  return basePrice;
}

export async function seedBundles(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (bundleRows.length === 0) {
    return {
      table: "bundles",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const bundleCodes = bundleRows.map((row) => row.code);
  const { data: existingRows, error: selectError } = await supabase
    .from("bundles")
    .select("code")
    .in("code", bundleCodes);

  if (selectError) {
    throw new Error(`Select bundles failed: ${selectError.message}`);
  }

  const existingCodes = new Set(
    (existingRows ?? []).map((row) => String(row.code ?? "")),
  );

  const allCodes = bundleRows.flatMap((row) =>
    row.code_items.map((item) => item.code),
  );
  const crewCodes = allCodes.filter((code) => code.startsWith("DS-CW-"));
  const rentalCodes = allCodes.filter((code) => code.startsWith("DS-RT-"));
  const expendableCodes = allCodes.filter((code) => code.startsWith("DS-ED-"));
  const fnbCodes = allCodes.filter((code) => code.startsWith("DS-FB-"));
  const locationCodes = allCodes.filter((code) => code.startsWith("DS-LC-"));

  const [
    crewResult,
    rentalResult,
    expendableResult,
    fnbResult,
    locationResult,
  ] = await Promise.all([
    crewCodes.length
      ? supabase.from("crews").select("id, code, price").in("code", crewCodes)
      : Promise.resolve({ data: [], error: null }),
    rentalCodes.length
      ? supabase
          .from("rentals")
          .select("id, code, price")
          .in("code", rentalCodes)
      : Promise.resolve({ data: [], error: null }),
    expendableCodes.length
      ? supabase
          .from("expendables")
          .select("id, code, price")
          .in("code", expendableCodes)
      : Promise.resolve({ data: [], error: null }),
    fnbCodes.length
      ? supabase
          .from("food_and_beverage")
          .select("id, code, price")
          .in("code", fnbCodes)
      : Promise.resolve({ data: [], error: null }),
    locationCodes.length
      ? supabase
          .from("locations")
          .select("id, code, price")
          .in("code", locationCodes)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (crewResult.error) {
    throw new Error(
      `Select crews for bundles failed: ${crewResult.error.message}`,
    );
  }
  if (rentalResult.error) {
    throw new Error(
      `Select rentals for bundles failed: ${rentalResult.error.message}`,
    );
  }
  if (expendableResult.error) {
    throw new Error(
      `Select expendables for bundles failed: ${expendableResult.error.message}`,
    );
  }
  if (fnbResult.error) {
    throw new Error(
      `Select food_and_beverage for bundles failed: ${fnbResult.error.message}`,
    );
  }
  if (locationResult.error) {
    throw new Error(
      `Select locations for bundles failed: ${locationResult.error.message}`,
    );
  }

  const priceLookup = new Map<string, number>();
  (crewResult.data ?? []).forEach((row) => {
    priceLookup.set(String(row.code), Number(row.price ?? 0));
  });
  (rentalResult.data ?? []).forEach((row) => {
    priceLookup.set(String(row.code), Number(row.price ?? 0));
  });
  (expendableResult.data ?? []).forEach((row) => {
    priceLookup.set(String(row.code), Number(row.price ?? 0));
  });
  (fnbResult.data ?? []).forEach((row) => {
    priceLookup.set(String(row.code), Number(row.price ?? 0));
  });
  (locationResult.data ?? []).forEach((row) => {
    priceLookup.set(String(row.code), Number(row.price ?? 0));
  });

  const rowsToInsert = bundleRows
    .filter((row) => !existingCodes.has(row.code))
    .map((row) => {
      const basePrice = calcBasePrice(row.code_items, priceLookup);
      const finalPrice = calcFinalPrice(
        basePrice,
        row.discount_type ?? null,
        row.discount_value ?? 0,
      );

      return {
        uuid: randomUUID(),
        code: row.code,
        name: row.name,
        description: row.description,
        is_active: row.is_active ?? true,
        base_price: basePrice,
        discount_type: row.discount_type ?? null,
        discount_value: row.discount_value ?? 0,
        final_price: finalPrice,
      };
    });

  let insertedBundles: Array<{ id: number; code: string }> = [];

  if (rowsToInsert.length > 0) {
    const { data: insertedRows, error: insertError } = await supabase
      .from("bundles")
      .insert(rowsToInsert)
      .select("id, code");

    if (insertError) {
      throw new Error(`Insert bundles failed: ${insertError.message}`);
    }

    insertedBundles = (insertedRows ?? []).map((row) => ({
      id: Number(row.id),
      code: String(row.code ?? ""),
    }));
  }

  if (insertedBundles.length === 0) {
    return {
      table: "bundles",
      total: bundleRows.length,
      inserted: 0,
      skipped: bundleRows.length,
    };
  }

  const codeLookup = new Map<string, CodeLookup>();
  (crewResult.data ?? []).forEach((row) => {
    codeLookup.set(String(row.code), { type: "crew", id: Number(row.id) });
  });
  (rentalResult.data ?? []).forEach((row) => {
    codeLookup.set(String(row.code), { type: "rental", id: Number(row.id) });
  });
  (expendableResult.data ?? []).forEach((row) => {
    codeLookup.set(String(row.code), {
      type: "expendable",
      id: Number(row.id),
    });
  });
  (fnbResult.data ?? []).forEach((row) => {
    codeLookup.set(String(row.code), { type: "fnb", id: Number(row.id) });
  });
  (locationResult.data ?? []).forEach((row) => {
    codeLookup.set(String(row.code), { type: "location", id: Number(row.id) });
  });

  if (locationCodes.length > 0) {
    console.warn(
      "[seedBundles] Location codes ditemukan tapi belum ada tabel bundle_locations:",
      locationCodes,
    );
  }

  const crewRows = [] as Array<{
    uuid: string;
    bundle_id: number;
    crew_id: number;
    quantity: number;
    notes: string | null;
  }>;
  const rentalRows = [] as Array<{
    uuid: string;
    bundle_id: number;
    rental_id: number;
    quantity: number;
    notes: string | null;
  }>;
  const fnbRows = [] as Array<{
    uuid: string;
    bundle_id: number;
    food_and_beverage_id: number;
    quantity: number;
    notes: string | null;
  }>;
  const expendableRows = [] as Array<{
    uuid: string;
    bundle_id: number;
    expendable_id: number;
    quantity: number;
    notes: string | null;
  }>;

  const insertedByCode = new Map(
    insertedBundles.map((bundle) => [bundle.code, bundle.id] as const),
  );

  bundleRows.forEach((bundle) => {
    const bundleId = insertedByCode.get(bundle.code);
    if (!bundleId) return;

    bundle.code_items.forEach((item) => {
      const itemType = getItemTypeFromCode(item.code);
      const lookup = codeLookup.get(item.code);
      const resolvedPrice = priceLookup.get(item.code) ?? 0;
      const notes = `seed price: ${resolvedPrice}`;

      if (!itemType) {
        console.warn("[seedBundles] Unknown code prefix:", item.code);
        return;
      }

      if (!lookup) {
        console.warn("[seedBundles] Code not found:", item.code);
        return;
      }

      if (lookup.type === "crew") {
        crewRows.push({
          uuid: randomUUID(),
          bundle_id: bundleId,
          crew_id: lookup.id,
          quantity: item.quantity,
          notes,
        });
        return;
      }

      if (lookup.type === "rental") {
        rentalRows.push({
          uuid: randomUUID(),
          bundle_id: bundleId,
          rental_id: lookup.id,
          quantity: item.quantity,
          notes,
        });
        return;
      }

      if (lookup.type === "fnb") {
        fnbRows.push({
          uuid: randomUUID(),
          bundle_id: bundleId,
          food_and_beverage_id: lookup.id,
          quantity: item.quantity,
          notes,
        });
        return;
      }

      if (lookup.type === "expendable") {
        expendableRows.push({
          uuid: randomUUID(),
          bundle_id: bundleId,
          expendable_id: lookup.id,
          quantity: item.quantity,
          notes,
        });
      }
    });
  });

  if (crewRows.length > 0) {
    const { error } = await supabase.from("bundle_crews").insert(crewRows);
    if (error) {
      throw new Error(`Insert bundle_crews failed: ${error.message}`);
    }
  }

  if (rentalRows.length > 0) {
    const { error } = await supabase.from("bundle_rentals").insert(rentalRows);
    if (error) {
      throw new Error(`Insert bundle_rentals failed: ${error.message}`);
    }
  }

  if (fnbRows.length > 0) {
    const { error } = await supabase
      .from("bundle_food_and_beverage")
      .insert(fnbRows);
    if (error) {
      throw new Error(
        `Insert bundle_food_and_beverage failed: ${error.message}`,
      );
    }
  }

  if (expendableRows.length > 0) {
    const { error } = await supabase
      .from("bundle_expendables")
      .insert(expendableRows);
    if (error) {
      throw new Error(`Insert bundle_expendables failed: ${error.message}`);
    }
  }

  return {
    table: "bundles",
    total: bundleRows.length,
    inserted: rowsToInsert.length,
    skipped: bundleRows.length - rowsToInsert.length,
  };
}
