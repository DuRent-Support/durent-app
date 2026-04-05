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
  const normalized = String(value ?? "").trim().toLowerCase();

  if (
    normalized === "food-and-beverage" ||
    normalized === "food beverage" ||
    normalized === "food_and_beverage"
  ) {
    return "food_and_beverage";
  }

  return normalized.replace(/-/g, "_") || "location";
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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const serviceRoleClient = createServiceRoleClient();
    const body = await request.json();
    const items = (
      Array.isArray(body?.items) ? body.items : []
    ) as CheckoutItem[];

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

    const grossAmount = items.reduce(
      (sum: number, item: { subtotal?: number }) => {
        return sum + Number(item?.subtotal || 0);
      },
      0,
    );

    const normalizedItems = items.map((item) => {
      const itemId = Number.parseInt(String(item.id ?? "").trim(), 10);
      const bookingStart = toDateOnly(item.dateRange?.from);
      const bookingEnd = toDateOnly(item.dateRange?.to ?? item.dateRange?.from);
      const quantity = Math.max(1, Number(item.quantity ?? item.days ?? 1));
      const unitPriceSnapshot = Math.max(0, Number(item.unitPrice || 0));
      const lineTotal = Math.max(
        0,
        Number(item.subtotal ?? unitPriceSnapshot * quantity),
      );

      if (!Number.isInteger(itemId) || itemId <= 0) {
        return null;
      }

      return {
        item_type: normalizeItemType(item.itemType),
        item_id: itemId,
        item_name_snapshot: String(item.name || "Item"),
        quantity,
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
      item_details: items.map((item) => ({
        id: String(item.id || ""),
        price: Number(item.unitPrice || 0),
        quantity: Number(item.days || 1),
        name: String(item.name || "Item"),
      })),
    };

    const token = await snap.createTransaction(parameter);

    if (!token?.token) {
      return NextResponse.json(
        { message: "Gagal mendapatkan token Midtrans" },
        { status: 500 },
      );
    }
    const { data: createdOrder, error: orderInsertError } = await serviceRoleClient
      .from("orders")
      .insert({
        uuid: orderUuid,
        code: orderCode,
        user_uuid: authUser.id,
        purpose: "Shooting",
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

    const orderItemRows = normalizedItems
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map((item) => ({
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
