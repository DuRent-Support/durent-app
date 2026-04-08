import Midtrans from "midtrans-client";
import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const snap = new Midtrans.Snap({
  // Set to true if you want Production Environment (accept real transaction).
  isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
});

type CheckoutItem = {
  id?: string;
  itemType?: string;
  name?: string;
  subtotal?: number;
  unitPrice?: number;
  quantity?: number;
  days?: number;
  dateRange?: {
    from?: string;
    to?: string;
  };
};

type CodeCounterRow = {
  prefix_code: string;
  last_number: number | null;
};

type ExistingLocationBookingRow = {
  item_id: number | string | null;
  booking_start: string | null;
  booking_end: string | null;
};

type BundleCrewRow = {
  bundle_id: number;
  crew_id: number;
  quantity: number | null;
};

type BundleRentalRow = {
  bundle_id: number;
  rental_id: number;
  quantity: number | null;
};

type BundleFoodAndBeverageRow = {
  bundle_id: number;
  food_and_beverage_id: number;
  quantity: number | null;
};

type BundleExpendableRow = {
  bundle_id: number;
  expendable_id: number;
  quantity: number | null;
};

type ItemSnapshotRow = {
  id: number;
  name: string | null;
  price: number | null;
};

const ACTIVE_BOOKING_STATUSES = [
  "pending",
  "paid",
  "settlement",
  "capture",
  "challenge",
];

const INDONESIA_TIME_ZONE = "Asia/Jakarta";

function formatDateOnlyInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function toDateOnly(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalizedValue = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue;
  }

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return formatDateOnlyInTimeZone(date, INDONESIA_TIME_ZONE);
}

function getTodayDateOnly() {
  return formatDateOnlyInTimeZone(new Date(), INDONESIA_TIME_ZONE);
}

function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(date);

  const day = parts.find((part) => part.type === "day")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const year = parts.find((part) => part.type === "year")?.value;

  if (!day || !month || !year) {
    return null;
  }

  return { day, month, year };
}

function buildOrderCodePrefix() {
  const dateParts = getDatePartsInTimeZone(new Date(), INDONESIA_TIME_ZONE);

  if (!dateParts) {
    return null;
  }

  return `DR-${dateParts.day}${dateParts.month}${dateParts.year}`;
}

function formatOrderCode(prefix: string, number: number) {
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

function normalizeItemType(value: string | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (
    normalized === "food-and-beverage" ||
    normalized === "food beverage" ||
    normalized === "food_and_beverage"
  ) {
    return "food_and_beverage";
  }

  return normalized.replace(/-/g, "_") || "location";
}

function hasDateRangeOverlap(
  firstStart: string,
  firstEnd: string,
  secondStart: string,
  secondEnd: string,
) {
  return firstStart <= secondEnd && secondStart <= firstEnd;
}

async function generateOrderCode() {
  const serviceRoleClient = createServiceRoleClient();
  const prefixCode = buildOrderCodePrefix();

  if (!prefixCode) {
    throw new Error("Gagal membuat prefix code order");
  }

  const counterResult = await serviceRoleClient
    .from("code_counter")
    .select("prefix_code, last_number")
    .eq("prefix_code", prefixCode)
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
        prefix_code: prefixCode,
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
      .eq("prefix_code", prefixCode);

    if (updateCounterResult.error) {
      throw new Error(updateCounterResult.error.message);
    }
  }

  return formatOrderCode(prefixCode, nextNumber);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function splitUserName(rawName: unknown) {
  const fullName = String(rawName ?? "").trim();
  if (!fullName) {
    return {
      firstName: "Customer",
      lastName: "",
    };
  }

  const parts = fullName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: "",
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function normalizePositiveInt(value: unknown, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.trunc(parsed));
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const serviceRoleClient = createServiceRoleClient();
    const body = await request.json();
    const items = (
      Array.isArray(body?.items) ? body.items : []
    ) as CheckoutItem[];
    const purpose = String(body?.purpose ?? "").trim();

    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { message: "User belum login" },
        { status: 401 },
      );
    }

    if (!authUser.email) {
      return NextResponse.json(
        { message: "Email user tidak tersedia" },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { message: "Item checkout kosong" },
        { status: 400 },
      );
    }

    // console.log("Midtrans checkout user:", {
    //   id: authUser.id,
    //   email: authUser.email,
    //   phone: authUser.phone,
    //   full_name: authUser.user_metadata?.full_name ?? null,
    //   name: authUser.user_metadata?.name ?? null,
    // });

    console.log("Midtrans checkout items:", items);

    const normalizedItems = items.map((item) => {
      const itemId = Number.parseInt(String(item.id ?? "").trim(), 10);
      const itemType = normalizeItemType(item.itemType);
      const bookingStart = toDateOnly(item.dateRange?.from);
      const bookingEnd = toDateOnly(item.dateRange?.to ?? item.dateRange?.from);
      const baseQuantity = Math.max(1, Number(item.quantity ?? 1));
      const bookingDays = Math.max(1, Number(item.days ?? 1));
      const chargeUnits =
        itemType === "location" ? bookingDays : baseQuantity * bookingDays;
      const unitPriceSnapshot = Math.max(
        0,
        Math.round(Number(item.unitPrice || 0)),
      );
      const expectedLineTotal = unitPriceSnapshot * chargeUnits;
      const lineTotal = Math.max(
        0,
        Math.round(Number(item.subtotal ?? expectedLineTotal)),
      );

      if (!Number.isInteger(itemId) || itemId <= 0) {
        return null;
      }

      return {
        item_type: itemType,
        item_id: itemId,
        item_name_snapshot: String(item.name || "Item"),
        quantity: chargeUnits,
        display_quantity: baseQuantity,
        booking_days: bookingDays,
        unit_price_snapshot: unitPriceSnapshot,
        line_total: lineTotal,
        booking_start: bookingStart,
        booking_end: bookingEnd,
      };
    });

    const todayDateOnly = getTodayDateOnly();
    if (!todayDateOnly) {
      return NextResponse.json(
        { message: "Gagal membaca waktu lokal Indonesia" },
        { status: 500 },
      );
    }

    const hasPastBookingDate = normalizedItems.some(
      (item) =>
        item !== null &&
        ((item.booking_start !== null && item.booking_start < todayDateOnly) ||
          (item.booking_end !== null && item.booking_end < todayDateOnly)),
    );

    if (hasPastBookingDate) {
      return NextResponse.json(
        { message: "Tanggal booking yang sudah lewat tidak dapat diproses" },
        { status: 400 },
      );
    }

    if (normalizedItems.some((item) => item === null)) {
      return NextResponse.json(
        { message: "Data order item tidak valid" },
        { status: 400 },
      );
    }

    const normalizedValidItems = normalizedItems.filter(
      (item): item is NonNullable<typeof item> => item !== null,
    );

    const standardOrderItems = normalizedValidItems
      .filter((item) => item.item_type !== "bundle")
      .map((item) => ({
        item_type: item.item_type,
        item_id: item.item_id,
        item_name_snapshot: item.item_name_snapshot,
        quantity: item.quantity,
        unit_price_snapshot: item.unit_price_snapshot,
        line_total: item.line_total,
        booking_start: item.booking_start,
        booking_end: item.booking_end,
        is_from_bundle: false,
        bundle_id: null as number | null,
      }));

    const bundleItems = normalizedValidItems.filter(
      (item) => item.item_type === "bundle",
    );

    const expandedBundleOrderItems: Array<{
      item_type: string;
      item_id: number;
      item_name_snapshot: string;
      quantity: number;
      unit_price_snapshot: number;
      line_total: number;
      booking_start: string | null;
      booking_end: string | null;
      is_from_bundle: boolean;
      bundle_id: number | null;
    }> = [];

    if (bundleItems.length > 0) {
      const bundleIds = [...new Set(bundleItems.map((item) => item.item_id))];

      const [
        bundleCrewsResult,
        bundleRentalsResult,
        bundleFnBResult,
        bundleExpendablesResult,
      ] = await Promise.all([
        serviceRoleClient
          .from("bundle_crews")
          .select("bundle_id, crew_id, quantity")
          .in("bundle_id", bundleIds),
        serviceRoleClient
          .from("bundle_rentals")
          .select("bundle_id, rental_id, quantity")
          .in("bundle_id", bundleIds),
        serviceRoleClient
          .from("bundle_food_and_beverage")
          .select("bundle_id, food_and_beverage_id, quantity")
          .in("bundle_id", bundleIds),
        serviceRoleClient
          .from("bundle_expendables")
          .select("bundle_id, expendable_id, quantity")
          .in("bundle_id", bundleIds),
      ]);

      if (
        bundleCrewsResult.error ||
        bundleRentalsResult.error ||
        bundleFnBResult.error ||
        bundleExpendablesResult.error
      ) {
        console.error("Bundle components fetch error:", {
          crews: bundleCrewsResult.error,
          rentals: bundleRentalsResult.error,
          foodAndBeverage: bundleFnBResult.error,
          expendables: bundleExpendablesResult.error,
        });

        return NextResponse.json(
          { message: "Gagal memuat detail item bundle" },
          { status: 500 },
        );
      }

      type BundleComponent = {
        item_type: "crew" | "rental" | "food_and_beverage" | "expendable";
        item_id: number;
        quantity_per_bundle: number;
      };

      const bundleComponentsMap = new Map<number, BundleComponent[]>();

      ((bundleCrewsResult.data ?? []) as BundleCrewRow[]).forEach((row) => {
        const bucket = bundleComponentsMap.get(row.bundle_id) ?? [];
        bucket.push({
          item_type: "crew",
          item_id: row.crew_id,
          quantity_per_bundle: normalizePositiveInt(row.quantity, 1),
        });
        bundleComponentsMap.set(row.bundle_id, bucket);
      });

      ((bundleRentalsResult.data ?? []) as BundleRentalRow[]).forEach((row) => {
        const bucket = bundleComponentsMap.get(row.bundle_id) ?? [];
        bucket.push({
          item_type: "rental",
          item_id: row.rental_id,
          quantity_per_bundle: normalizePositiveInt(row.quantity, 1),
        });
        bundleComponentsMap.set(row.bundle_id, bucket);
      });

      ((bundleFnBResult.data ?? []) as BundleFoodAndBeverageRow[]).forEach(
        (row) => {
          const bucket = bundleComponentsMap.get(row.bundle_id) ?? [];
          bucket.push({
            item_type: "food_and_beverage",
            item_id: row.food_and_beverage_id,
            quantity_per_bundle: normalizePositiveInt(row.quantity, 1),
          });
          bundleComponentsMap.set(row.bundle_id, bucket);
        },
      );

      ((bundleExpendablesResult.data ?? []) as BundleExpendableRow[]).forEach(
        (row) => {
          const bucket = bundleComponentsMap.get(row.bundle_id) ?? [];
          bucket.push({
            item_type: "expendable",
            item_id: row.expendable_id,
            quantity_per_bundle: normalizePositiveInt(row.quantity, 1),
          });
          bundleComponentsMap.set(row.bundle_id, bucket);
        },
      );

      const crewIds = new Set<number>();
      const rentalIds = new Set<number>();
      const fnbIds = new Set<number>();
      const expendableIds = new Set<number>();

      bundleComponentsMap.forEach((components) => {
        components.forEach((component) => {
          if (component.item_type === "crew") {
            crewIds.add(component.item_id);
          } else if (component.item_type === "rental") {
            rentalIds.add(component.item_id);
          } else if (component.item_type === "food_and_beverage") {
            fnbIds.add(component.item_id);
          } else {
            expendableIds.add(component.item_id);
          }
        });
      });

      const [crewResult, rentalResult, fnbResult, expendableResult] =
        await Promise.all([
          crewIds.size > 0
            ? serviceRoleClient
                .from("crews")
                .select("id, name, price")
                .in("id", [...crewIds])
            : Promise.resolve({ data: [], error: null }),
          rentalIds.size > 0
            ? serviceRoleClient
                .from("rentals")
                .select("id, name, price")
                .in("id", [...rentalIds])
            : Promise.resolve({ data: [], error: null }),
          fnbIds.size > 0
            ? serviceRoleClient
                .from("food_and_beverage")
                .select("id, name, price")
                .in("id", [...fnbIds])
            : Promise.resolve({ data: [], error: null }),
          expendableIds.size > 0
            ? serviceRoleClient
                .from("expendables")
                .select("id, name, price")
                .in("id", [...expendableIds])
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (
        crewResult.error ||
        rentalResult.error ||
        fnbResult.error ||
        expendableResult.error
      ) {
        console.error("Bundle item snapshots fetch error:", {
          crews: crewResult.error,
          rentals: rentalResult.error,
          foodAndBeverage: fnbResult.error,
          expendables: expendableResult.error,
        });

        return NextResponse.json(
          { message: "Gagal memuat snapshot harga item bundle" },
          { status: 500 },
        );
      }

      const itemSnapshotMap = new Map<string, ItemSnapshotRow>();

      ((crewResult.data ?? []) as ItemSnapshotRow[]).forEach((row) => {
        itemSnapshotMap.set(`crew:${row.id}`, row);
      });

      ((rentalResult.data ?? []) as ItemSnapshotRow[]).forEach((row) => {
        itemSnapshotMap.set(`rental:${row.id}`, row);
      });

      ((fnbResult.data ?? []) as ItemSnapshotRow[]).forEach((row) => {
        itemSnapshotMap.set(`food_and_beverage:${row.id}`, row);
      });

      ((expendableResult.data ?? []) as ItemSnapshotRow[]).forEach((row) => {
        itemSnapshotMap.set(`expendable:${row.id}`, row);
      });

      for (const bundleItem of bundleItems) {
        const bundleId = bundleItem.item_id;
        const bundledComponents = bundleComponentsMap.get(bundleId) ?? [];

        if (bundledComponents.length === 0) {
          return NextResponse.json(
            {
              message:
                "Bundle tidak memiliki item turunan yang valid. Silakan periksa data bundle.",
            },
            { status: 400 },
          );
        }

        const bundleQty = normalizePositiveInt(bundleItem.quantity, 1);
        const missingSnapshotKeys: string[] = [];

        bundledComponents.forEach((component) => {
          const snapshotKey = `${component.item_type}:${component.item_id}`;
          const snapshot = itemSnapshotMap.get(snapshotKey);

          if (!snapshot) {
            missingSnapshotKeys.push(snapshotKey);
            return;
          }

          const totalQuantity = component.quantity_per_bundle * bundleQty;
          const unitPriceSnapshot = Math.max(
            0,
            Math.round(Number(snapshot.price ?? 0)),
          );

          expandedBundleOrderItems.push({
            item_type: component.item_type,
            item_id: component.item_id,
            item_name_snapshot:
              String(snapshot.name || "Item dari bundle").trim() ||
              "Item dari bundle",
            quantity: totalQuantity,
            unit_price_snapshot: unitPriceSnapshot,
            line_total: unitPriceSnapshot * totalQuantity,
            booking_start: bundleItem.booking_start,
            booking_end: bundleItem.booking_end,
            is_from_bundle: true,
            bundle_id: bundleId,
          });
        });

        if (missingSnapshotKeys.length > 0) {
          return NextResponse.json(
            {
              message:
                "Sebagian item turunan bundle tidak ditemukan. Silakan cek data bundle terlebih dahulu.",
            },
            { status: 400 },
          );
        }
      }
    }

    const grossAmount = normalizedValidItems.reduce(
      (sum, item) => sum + item.line_total,
      0,
    );

    const locationItems = normalizedValidItems.filter(
      (item) => item.item_type === "location",
    );

    const hasInvalidLocationDateRange = locationItems.some(
      (item) =>
        !item.booking_start ||
        !item.booking_end ||
        item.booking_start > item.booking_end,
    );

    if (hasInvalidLocationDateRange) {
      return NextResponse.json(
        { message: "Tanggal booking lokasi tidak valid" },
        { status: 400 },
      );
    }

    if (locationItems.length > 0) {
      const locationIds = [
        ...new Set(locationItems.map((item) => item.item_id)),
      ];

      const { data: activeOrders, error: activeOrdersError } =
        await serviceRoleClient
          .from("orders")
          .select("id")
          .in("payment_status", ACTIVE_BOOKING_STATUSES);

      if (activeOrdersError) {
        console.error(
          "Checkout conflict orders fetch error:",
          activeOrdersError,
        );
        return NextResponse.json(
          { message: "Gagal memvalidasi ketersediaan lokasi" },
          { status: 500 },
        );
      }

      const activeOrderIds = (activeOrders ?? [])
        .map((row) => Number(row.id))
        .filter((id) => Number.isFinite(id));

      if (activeOrderIds.length > 0) {
        const { data: existingRows, error: existingRowsError } =
          await serviceRoleClient
            .from("order_items")
            .select("item_id, booking_start, booking_end")
            .in("order_id", activeOrderIds)
            .eq("item_type", "location")
            .in("item_id", locationIds);

        if (existingRowsError) {
          console.error(
            "Checkout conflict order_items fetch error:",
            existingRowsError,
          );
          return NextResponse.json(
            { message: "Gagal memvalidasi jadwal booking lokasi" },
            { status: 500 },
          );
        }

        const existingByLocation = new Map<
          string,
          ExistingLocationBookingRow[]
        >();

        ((existingRows ?? []) as ExistingLocationBookingRow[]).forEach(
          (row) => {
            const locationId = String(row.item_id || "").trim();

            if (
              locationId.length === 0 ||
              !row.booking_start ||
              !row.booking_end
            ) {
              return;
            }

            const bucket = existingByLocation.get(locationId) ?? [];
            bucket.push(row);
            existingByLocation.set(locationId, bucket);
          },
        );

        const hasLocationConflict = locationItems.some((item) => {
          const locationId = String(item.item_id);
          const requestedStart = item.booking_start;
          const requestedEnd = item.booking_end;
          const existingBookings = existingByLocation.get(locationId) ?? [];

          if (!requestedStart || !requestedEnd) {
            return true;
          }

          return existingBookings.some((existing) => {
            if (!existing.booking_start || !existing.booking_end) {
              return false;
            }

            return hasDateRangeOverlap(
              requestedStart,
              requestedEnd,
              existing.booking_start,
              existing.booking_end,
            );
          });
        });

        if (hasLocationConflict) {
          return NextResponse.json(
            {
              message:
                "Range tanggal lokasi bentrok dengan booking lain. Silakan pilih tanggal lain.",
            },
            { status: 409 },
          );
        }
      }
    }

    const orderCode = await generateOrderCode();
    const orderUuid = crypto.randomUUID();
    const pageExpiryMinutes = 5;
    const expiresAt = addMinutes(new Date(), pageExpiryMinutes).toISOString();
    const profileName =
      authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "";
    const { firstName, lastName } = splitUserName(profileName);

    const parameter = {
      transaction_details: {
        order_id: orderCode,
        gross_amount: grossAmount,
      },

      enabled_payments: [
        "bca_va",
        "bni_va",
        "bri_va",
        "permata_va",
        "gopay",
        "shopeepay",
      ],
      customer_details: {
        first_name: firstName,
        last_name: lastName,
        email: authUser.email,
        phone: authUser.phone || undefined,
      },
      page_expiry: {
        duration: pageExpiryMinutes,
        unit: "minute",
      },
      item_details: normalizedValidItems.map((item) => ({
        id: String(item.item_id),
        price: item.unit_price_snapshot,
        quantity: item.quantity,
        name: item.item_name_snapshot,
      })),
    };

    const token = await snap.createTransaction(parameter);

    if (!token?.token) {
      return NextResponse.json(
        { message: "Gagal mendapatkan token Midtrans" },
        { status: 500 },
      );
    }
    const { data: createdOrder, error: orderInsertError } =
      await serviceRoleClient
        .from("orders")
        .insert({
          uuid: orderUuid,
          code: orderCode,
          user_uuid: authUser.id,
          purpose: purpose || "Shooting",
          shooting_address: "Alamat shooting akan dikonfirmasi",
          payment_status: "pending",
          subtotal_amount: grossAmount,
          bundle_discount_amount: 0,
          promo_discount_amount: 0,
          total_discount_amount: 0,
          grand_total_amount: grossAmount,
          midtrans_token: token.token,
          midtrans_expires_at: expiresAt,
        })
        .select("id, code")
        .single();

    if (orderInsertError || !createdOrder) {
      console.error("Insert orders error:", orderInsertError);
      return NextResponse.json(
        { message: "Gagal membuat order" },
        { status: 500 },
      );
    }

    const finalOrderItemPayload = [
      ...standardOrderItems,
      ...expandedBundleOrderItems,
    ];

    const orderItemRows = finalOrderItemPayload.map((item) => ({
      uuid: crypto.randomUUID(),
      order_id: createdOrder.id,
      item_type: item.item_type,
      item_id: item.item_id,
      item_name_snapshot: item.item_name_snapshot,
      quantity: item.quantity,
      unit_price_snapshot: item.unit_price_snapshot,
      line_total: item.line_total,
      booking_start: item.booking_start,
      booking_end: item.booking_end,
      is_from_bundle: item.is_from_bundle,
      bundle_id: item.bundle_id,
    }));

    const { error: orderItemsInsertError } = await serviceRoleClient
      .from("order_items")
      .insert(orderItemRows);

    if (orderItemsInsertError) {
      console.error("Insert order_items error:", orderItemsInsertError);
      await serviceRoleClient.from("orders").delete().eq("id", createdOrder.id);
      return NextResponse.json(
        { message: "Gagal membuat order item" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token: token.token,
      order_id: createdOrder.code,
      gross_amount: grossAmount,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("Midtrans tokenizer error:", error);
    return NextResponse.json(
      { message: "Gagal membuat token Midtrans" },
      { status: 500 },
    );
  }
}
