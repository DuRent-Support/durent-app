import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import { requireAdmin } from "../master-data/_shared";

type InventoryItemType =
  | "locations"
  | "crews"
  | "rentals"
  | "food-and-beverage"
  | "expendables"
  | "bundles";

type InventoryMutableItemType = Exclude<InventoryItemType, "bundles">;

type TableName =
  | "locations"
  | "crews"
  | "rentals"
  | "food_and_beverage"
  | "expendables";

type BaseInventoryRow = {
  id: number | null;
  code: string | null;
  name: string | null;
  description: string | null;
  price: number | null;
  is_available: boolean | null;
};

type BundleInventoryRow = {
  id: number | null;
  code: string | null;
  name: string | null;
  description: string | null;
  final_price: number | null;
  is_active: boolean | null;
};

type InventoryItem = {
  id: number;
  item_type: InventoryItemType;
  code: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
};

type InventoryPayload = {
  item_type?: InventoryMutableItemType;
  name?: string;
  description?: string;
  price?: number;
  is_available?: boolean;
};

const tableMap: Record<InventoryMutableItemType, TableName> = {
  locations: "locations",
  crews: "crews",
  rentals: "rentals",
  "food-and-beverage": "food_and_beverage",
  expendables: "expendables",
};

function parsePayload(payload: InventoryPayload) {
  const itemType = payload.item_type;
  const name = String(payload.name ?? "").trim();
  const description = String(payload.description ?? "").trim();
  const price = Number(payload.price ?? 0);
  const isAvailable = Boolean(payload.is_available ?? true);

  if (!itemType || !(itemType in tableMap)) {
    return { ok: false as const, message: "Jenis item tidak valid." };
  }

  if (!name) {
    return { ok: false as const, message: "Nama wajib diisi." };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { ok: false as const, message: "Harga harus berupa angka >= 0." };
  }

  return {
    ok: true as const,
    data: {
      itemType,
      name,
      description,
      price,
      isAvailable,
    },
  };
}

function buildCode(itemType: InventoryMutableItemType) {
  const prefixMap: Record<InventoryMutableItemType, string> = {
    locations: "LC",
    crews: "CR",
    rentals: "RT",
    "food-and-beverage": "FB",
    expendables: "EX",
  };

  return `INV-${prefixMap[itemType]}-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function listInventory() {
  const serviceRoleClient = createServiceRoleClient();

  const [
    locationsResult,
    crewsResult,
    rentalsResult,
    fnbResult,
    expendablesResult,
    bundlesResult,
  ] = await Promise.all([
    serviceRoleClient
      .from("locations")
      .select("id, code, name, description, price, is_available"),
    serviceRoleClient
      .from("crews")
      .select("id, code, name, description, price, is_available"),
    serviceRoleClient
      .from("rentals")
      .select("id, code, name, description, price, is_available"),
    serviceRoleClient
      .from("food_and_beverage")
      .select("id, code, name, description, price, is_available"),
    serviceRoleClient
      .from("expendables")
      .select("id, code, name, description, price, is_available"),
    serviceRoleClient
      .from("bundles")
      .select("id, code, name, description, final_price, is_active"),
  ]);

  if (
    locationsResult.error ||
    crewsResult.error ||
    rentalsResult.error ||
    fnbResult.error ||
    expendablesResult.error ||
    bundlesResult.error
  ) {
    console.error("Fetch inventory union data error:", {
      locations: locationsResult.error,
      crews: crewsResult.error,
      rentals: rentalsResult.error,
      foodAndBeverage: fnbResult.error,
      expendables: expendablesResult.error,
      bundles: bundlesResult.error,
    });

    throw new Error("Gagal mengambil data inventory.");
  }

  const mergeWithType = (
    rows: BaseInventoryRow[],
    itemType: InventoryItemType,
  ): InventoryItem[] =>
    rows
      .filter((row) => Number.isInteger(Number(row.id)))
      .map((row, index) => ({
        id: Number(row.id),
        item_type: itemType,
        code:
          String(row.code ?? "").trim() || `NO-CODE-${itemType}-${index + 1}`,
        name: String(row.name ?? "").trim() || "Unnamed Item",
        description: String(row.description ?? "").trim(),
        price: Number.isFinite(Number(row.price)) ? Number(row.price) : 0,
        is_available: Boolean(row.is_available ?? true),
      }));

  return [
    ...mergeWithType(
      (locationsResult.data ?? []) as BaseInventoryRow[],
      "locations",
    ),
    ...mergeWithType((crewsResult.data ?? []) as BaseInventoryRow[], "crews"),
    ...mergeWithType(
      (rentalsResult.data ?? []) as BaseInventoryRow[],
      "rentals",
    ),
    ...mergeWithType(
      (fnbResult.data ?? []) as BaseInventoryRow[],
      "food-and-beverage",
    ),
    ...mergeWithType(
      (expendablesResult.data ?? []) as BaseInventoryRow[],
      "expendables",
    ),
    ...((bundlesResult.data ?? []) as BundleInventoryRow[])
      .filter((row) => Number.isInteger(Number(row.id)))
      .map((row, index) => ({
        id: Number(row.id),
        item_type: "bundles" as const,
        code: String(row.code ?? "").trim() || `NO-CODE-bundles-${index + 1}`,
        name: String(row.name ?? "").trim() || "Unnamed Item",
        description: String(row.description ?? "").trim(),
        price: Number.isFinite(Number(row.final_price))
          ? Number(row.final_price)
          : 0,
        is_available: Boolean(row.is_active ?? true),
      })),
  ];
}

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const items = await listInventory();

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Get admin inventory error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil inventory." },
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

    const parsed = parsePayload((await request.json()) as InventoryPayload);
    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const { itemType, name, description, price, isAvailable } = parsed.data;
    const table = tableMap[itemType];
    const serviceRoleClient = createServiceRoleClient();

    const basePayload: Record<string, unknown> = {
      uuid: crypto.randomUUID(),
      code: buildCode(itemType),
      name,
      description,
      price,
      is_available: isAvailable,
    };

    if (itemType === "locations") {
      basePayload.city = "";
      basePayload.area = 0;
      basePayload.pax = 0;
    }

    const { error } = await serviceRoleClient.from(table).insert(basePayload);
    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    const items = await listInventory();
    return NextResponse.json(
      { message: "Item berhasil ditambahkan.", items },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create admin inventory item error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menambahkan item." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const payload = (await request.json()) as InventoryPayload & {
      id?: number;
    };
    const parsed = parsePayload(payload);

    if (!parsed.ok) {
      return NextResponse.json({ message: parsed.message }, { status: 400 });
    }

    const itemId = Number(payload.id);
    if (!Number.isInteger(itemId)) {
      return NextResponse.json(
        { message: "ID item tidak valid." },
        { status: 400 },
      );
    }

    const { itemType, name, description, price, isAvailable } = parsed.data;
    const table = tableMap[itemType];
    const serviceRoleClient = createServiceRoleClient();

    const { error } = await serviceRoleClient
      .from(table)
      .update({
        name,
        description,
        price,
        is_available: isAvailable,
      })
      .eq("id", itemId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    const items = await listInventory();
    return NextResponse.json(
      { message: "Item berhasil diupdate.", items },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update admin inventory item error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengupdate item." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const payload = (await request.json()) as {
      id?: number;
      item_type?: InventoryMutableItemType;
    };

    const itemType = payload.item_type;
    const itemId = Number(payload.id);

    if (!itemType || !(itemType in tableMap) || !Number.isInteger(itemId)) {
      return NextResponse.json(
        { message: "Data item tidak valid." },
        { status: 400 },
      );
    }

    const table = tableMap[itemType];
    const serviceRoleClient = createServiceRoleClient();

    const relationDeleteByType: Record<
      InventoryMutableItemType,
      Array<{ table: string; column: string }>
    > = {
      locations: [
        { table: "location_item_category", column: "location_id" },
        { table: "location_item_sub_category", column: "location_id" },
        { table: "location_images", column: "location_id" },
      ],
      crews: [
        { table: "crew_item_category", column: "crew_id" },
        { table: "crew_item_sub_category", column: "crew_id" },
        { table: "crew_images", column: "crew_id" },
      ],
      rentals: [
        { table: "rental_item_category", column: "rental_id" },
        { table: "rental_item_sub_category", column: "rental_id" },
        { table: "rental_images", column: "rental_id" },
      ],
      "food-and-beverage": [
        {
          table: "food_and_beverage_item_category",
          column: "food_and_beverage_id",
        },
        {
          table: "food_and_beverage_item_sub_category",
          column: "food_and_beverage_id",
        },
        {
          table: "food_and_beverage_images",
          column: "food_and_beverage_id",
        },
      ],
      expendables: [
        { table: "expendable_item_category", column: "expendable_id" },
        { table: "expendable_item_sub_category", column: "expendable_id" },
        { table: "expendable_images", column: "expendable_id" },
      ],
    };

    const relatedTables = relationDeleteByType[itemType] ?? [];
    for (const relation of relatedTables) {
      const { error: relationDeleteError } = await serviceRoleClient
        .from(relation.table)
        .delete()
        .eq(relation.column, itemId);

      if (relationDeleteError) {
        return NextResponse.json(
          { message: relationDeleteError.message },
          { status: 400 },
        );
      }
    }

    const { error } = await serviceRoleClient
      .from(table)
      .delete()
      .eq("id", itemId);

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    const items = await listInventory();
    return NextResponse.json(
      { message: "Item berhasil dihapus.", items },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete admin inventory item error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menghapus item." },
      { status: 500 },
    );
  }
}
