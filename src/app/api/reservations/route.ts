import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const MEDIA_BUCKET = "media";

type OrderRow = {
  id: number;
  code: string;
  user_uuid: string;
  purpose: string | null;
  payment_status: string | null;
  grand_total_amount: number | string | null;
  created_at: string | null;
};

type OrderItemRow = {
  order_id: number;
  item_type: string | null;
  item_id: number;
  item_name_snapshot: string | null;
  booking_start: string | null;
  booking_end: string | null;
  unit_price_snapshot: string | number | null;
  line_total: string | number | null;
  quantity: number | null;
  is_from_bundle: boolean | null;
  bundle_id: number | null;
};

type LocationImageRow = {
  location_id: number;
  url: string | null;
  position: number | null;
};

type CrewImageRow = {
  crew_id: number;
  url: string | null;
  position: number | null;
};

type RentalImageRow = {
  rental_id: number;
  url: string | null;
  position: number | null;
};

type FoodAndBeverageImageRow = {
  food_and_beverage_id: number;
  url: string | null;
  position: number | null;
};

type ExpendableImageRow = {
  expendable_id: number;
  url: string | null;
  position: number | null;
};

type BundleImageRow = {
  bundle_id: number;
  url: string | null;
  position: number | null;
};

type BundleRow = {
  id: number;
  name: string | null;
};

type SignedUrlRow = {
  signedUrl?: string;
  error?: string;
};

function parseNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const sanitized = value.replace(/[^0-9]/g, "");
    return Number.parseInt(sanitized, 10) || 0;
  }

  return 0;
}

function formatItemType(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return "Item";
  }

  return normalized
    .split("_")
    .join(" ")
    .split("-")
    .join(" ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pickLowerPosition(
  current: { url: string; position: number } | undefined,
  next: { url: string; position: number },
) {
  if (!current) {
    return next;
  }

  return next.position < current.position ? next : current;
}

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data: orderRows, error: orderError } = await supabase
      .from("orders")
      .select(
        "id, code, user_uuid, purpose, payment_status, grand_total_amount, created_at",
      )
      .eq("user_uuid", user.id)
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error("Fetch orders error:", orderError);
      return NextResponse.json(
        { message: "Gagal mengambil data orders." },
        { status: 500 },
      );
    }

    const orders = (orderRows ?? []) as OrderRow[];

    if (orders.length === 0) {
      return NextResponse.json({ reservations: [] }, { status: 200 });
    }

    const orderIds = orders.map((order) => order.id);

    const { data: orderItemRows, error: orderItemsError } = await supabase
      .from("order_items")
      .select(
        "order_id, item_type, item_id, item_name_snapshot, booking_start, booking_end, quantity, unit_price_snapshot, line_total, is_from_bundle, bundle_id",
      )
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (orderItemsError) {
      console.error("Fetch order_items error:", orderItemsError);
      return NextResponse.json(
        { message: "Gagal mengambil data order items." },
        { status: 500 },
      );
    }

    const itemsByOrderId = new Map<number, OrderItemRow[]>();

    ((orderItemRows ?? []) as OrderItemRow[]).forEach((item) => {
      const bucket = itemsByOrderId.get(item.order_id) ?? [];
      bucket.push(item);
      itemsByOrderId.set(item.order_id, bucket);
    });

    const typedOrderItems = (orderItemRows ?? []) as OrderItemRow[];
    const locationIds = new Set<number>();
    const crewIds = new Set<number>();
    const rentalIds = new Set<number>();
    const foodAndBeverageIds = new Set<number>();
    const expendableIds = new Set<number>();
    const bundleIds = new Set<number>();

    typedOrderItems.forEach((item) => {
      const itemType = String(item.item_type ?? "")
        .trim()
        .toLowerCase();
      const itemId = Number(item.item_id);

      if (!Number.isInteger(itemId) || itemId <= 0) {
        return;
      }

      if (itemType === "location") {
        locationIds.add(itemId);
      } else if (itemType === "crew") {
        crewIds.add(itemId);
      } else if (itemType === "rental") {
        rentalIds.add(itemId);
      } else if (itemType === "food_and_beverage") {
        foodAndBeverageIds.add(itemId);
      } else if (itemType === "expendable") {
        expendableIds.add(itemId);
      } else if (itemType === "bundle") {
        bundleIds.add(itemId);
      }

      const bundleId = Number(item.bundle_id ?? 0);
      if (Number.isInteger(bundleId) && bundleId > 0) {
        bundleIds.add(bundleId);
      }
    });

    const [
      locationImagesResult,
      crewImagesResult,
      rentalImagesResult,
      foodAndBeverageImagesResult,
      expendableImagesResult,
      bundleImagesResult,
      bundleNamesResult,
    ] = await Promise.all([
      locationIds.size > 0
        ? supabase
            .from("location_images")
            .select("location_id, url, position")
            .in("location_id", [...locationIds])
        : Promise.resolve({ data: [], error: null }),
      crewIds.size > 0
        ? supabase
            .from("crew_images")
            .select("crew_id, url, position")
            .in("crew_id", [...crewIds])
        : Promise.resolve({ data: [], error: null }),
      rentalIds.size > 0
        ? supabase
            .from("rental_images")
            .select("rental_id, url, position")
            .in("rental_id", [...rentalIds])
        : Promise.resolve({ data: [], error: null }),
      foodAndBeverageIds.size > 0
        ? supabase
            .from("food_and_beverage_images")
            .select("food_and_beverage_id, url, position")
            .in("food_and_beverage_id", [...foodAndBeverageIds])
        : Promise.resolve({ data: [], error: null }),
      expendableIds.size > 0
        ? supabase
            .from("expendable_images")
            .select("expendable_id, url, position")
            .in("expendable_id", [...expendableIds])
        : Promise.resolve({ data: [], error: null }),
      bundleIds.size > 0
        ? supabase
            .from("bundle_images")
            .select("bundle_id, url, position")
            .in("bundle_id", [...bundleIds])
        : Promise.resolve({ data: [], error: null }),
      bundleIds.size > 0
        ? supabase
            .from("bundles")
            .select("id, name")
            .in("id", [...bundleIds])
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (
      locationImagesResult.error ||
      crewImagesResult.error ||
      rentalImagesResult.error ||
      foodAndBeverageImagesResult.error ||
      expendableImagesResult.error ||
      bundleImagesResult.error ||
      bundleNamesResult.error
    ) {
      console.error("Fetch reservation images error:", {
        location: locationImagesResult.error,
        crew: crewImagesResult.error,
        rental: rentalImagesResult.error,
        foodAndBeverage: foodAndBeverageImagesResult.error,
        expendable: expendableImagesResult.error,
        bundle: bundleImagesResult.error,
        bundleNames: bundleNamesResult.error,
      });
    }

    const bundleNameMap = new Map<number, string>();
    ((bundleNamesResult.data ?? []) as BundleRow[]).forEach((row) => {
      const bundleId = Number(row.id);
      if (!Number.isInteger(bundleId) || bundleId <= 0) {
        return;
      }

      const bundleName = String(row.name ?? "").trim();
      if (bundleName) {
        bundleNameMap.set(bundleId, bundleName);
      }
    });

    const imagePaths = Array.from(
      new Set(
        [
          ...((locationImagesResult.data ?? []) as LocationImageRow[]),
          ...((crewImagesResult.data ?? []) as CrewImageRow[]),
          ...((rentalImagesResult.data ?? []) as RentalImageRow[]),
          ...((foodAndBeverageImagesResult.data ??
            []) as FoodAndBeverageImageRow[]),
          ...((expendableImagesResult.data ?? []) as ExpendableImageRow[]),
          ...((bundleImagesResult.data ?? []) as BundleImageRow[]),
        ]
          .map((row) => String(row.url ?? "").trim())
          .filter((path) => path.length > 0),
      ),
    );

    const signedUrlMap = new Map<string, string>();
    if (imagePaths.length > 0) {
      const signedResult = await supabase.storage
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

    const imageByItemKey = new Map<string, string>();

    const reduceImageRows = <
      T extends { url: string | null; position: number | null },
    >(
      rows: T[],
      keyBuilder: (row: T) => string,
    ) => {
      const bestImageByKey = new Map<
        string,
        { url: string; position: number }
      >();

      rows.forEach((row) => {
        const key = keyBuilder(row);
        const rawUrl = String(row.url ?? "").trim();

        if (!key || !rawUrl) {
          return;
        }

        const signed = signedUrlMap.get(rawUrl) ?? rawUrl;
        const candidate = {
          url: signed,
          position: Number.isFinite(Number(row.position))
            ? Number(row.position)
            : Number.MAX_SAFE_INTEGER,
        };

        bestImageByKey.set(
          key,
          pickLowerPosition(bestImageByKey.get(key), candidate),
        );
      });

      bestImageByKey.forEach((value, key) => {
        imageByItemKey.set(key, value.url);
      });
    };

    reduceImageRows(
      (locationImagesResult.data ?? []) as LocationImageRow[],
      (row) => `location:${row.location_id}`,
    );
    reduceImageRows(
      (crewImagesResult.data ?? []) as CrewImageRow[],
      (row) => `crew:${row.crew_id}`,
    );
    reduceImageRows(
      (rentalImagesResult.data ?? []) as RentalImageRow[],
      (row) => `rental:${row.rental_id}`,
    );
    reduceImageRows(
      (foodAndBeverageImagesResult.data ?? []) as FoodAndBeverageImageRow[],
      (row) => `food_and_beverage:${row.food_and_beverage_id}`,
    );
    reduceImageRows(
      (expendableImagesResult.data ?? []) as ExpendableImageRow[],
      (row) => `expendable:${row.expendable_id}`,
    );
    reduceImageRows(
      (bundleImagesResult.data ?? []) as BundleImageRow[],
      (row) => `bundle:${row.bundle_id}`,
    );

    const reservations = orders.map((order) => {
      const items = (itemsByOrderId.get(order.id) ?? []).map((item, index) => {
        const quantity = Math.max(1, Number(item.quantity ?? 1));
        const unitPrice = parseNumber(item.unit_price_snapshot);
        const lineTotal = Math.max(
          parseNumber(item.line_total),
          unitPrice * quantity,
        );

        return {
          id: `${order.code}-${item.item_id}-${index + 1}`,
          orderDbId: order.id,
          orderCode: order.code,
          itemType: String(item.item_type ?? "item"),
          itemTypeLabel: formatItemType(item.item_type),
          itemId: item.item_id,
          itemName:
            String(item.item_name_snapshot ?? "").trim() ||
            `Item ${item.item_id}`,
          quantity,
          unitPrice,
          lineTotal,
          bookingStart: item.booking_start,
          bookingEnd: item.booking_end,
          isFromBundle: Boolean(item.is_from_bundle),
          bundleId:
            Number.isInteger(Number(item.bundle_id)) &&
            Number(item.bundle_id) > 0
              ? Number(item.bundle_id)
              : null,
          bundleName:
            Number.isInteger(Number(item.bundle_id)) &&
            Number(item.bundle_id) > 0
              ? (bundleNameMap.get(Number(item.bundle_id)) ?? null)
              : null,
          imageUrl:
            imageByItemKey.get(
              `${String(item.item_type ?? "item")
                .trim()
                .toLowerCase()}:${item.item_id}`,
            ) ??
            (Number.isInteger(Number(item.bundle_id)) &&
            Number(item.bundle_id) > 0
              ? (imageByItemKey.get(`bundle:${Number(item.bundle_id)}`) ?? null)
              : null),
        };
      });

      return {
        id: order.id,
        orderCode: order.code,
        purpose: String(order.purpose ?? "").trim() || "Shooting",
        paymentStatus: String(order.payment_status ?? "pending"),
        createdAt: order.created_at,
        totalAmount: parseNumber(order.grand_total_amount),
        itemCount: items.length,
        items,
      };
    });

    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    console.error("Get reservations error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data reservasi." },
      { status: 500 },
    );
  }
}
