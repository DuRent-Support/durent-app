import Midtrans from "midtrans-client";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const snap = new Midtrans.Snap({
  // Set to true if you want Production Environment (accept real transaction).
  isProduction: process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY || "",
});

type CheckoutItem = {
  id?: string;
  name?: string;
  subtotal?: number;
  unitPrice?: number;
  days?: number;
  dateRange?: {
    from?: string;
    to?: string;
  };
};

function toDateOnly(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function getQuantityDays(startDateOnly: string, endDateOnly: string) {
  const start = new Date(`${startDateOnly}T00:00:00.000Z`);
  const end = new Date(`${endDateOnly}T00:00:00.000Z`);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(1, diffDays + 1);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    console.log("Midtrans tokenizer request body:", body);
    const user = body?.user;
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

    if (!user || !user.id || !user.email) {
      return NextResponse.json(
        { message: "User checkout tidak valid" },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { message: "Item checkout kosong" },
        { status: 400 },
      );
    }

    const grossAmount = items.reduce(
      (sum: number, item: { subtotal?: number }) => {
        return sum + Number(item?.subtotal || 0);
      },
      0,
    );

    const normalizedItems = items.map((item) => {
      const locationId = String(item.id || "").trim();
      const bookingStart = toDateOnly(item.dateRange?.from);
      const bookingEnd = toDateOnly(item.dateRange?.to ?? item.dateRange?.from);

      if (!locationId || !bookingStart || !bookingEnd) {
        return null;
      }

      return {
        location_id: locationId,
        booking_start: bookingStart,
        booking_end: bookingEnd,
        price: Number(item.unitPrice || 0),
        quantity: getQuantityDays(bookingStart, bookingEnd),
      };
    });

    if (normalizedItems.some((item) => item === null)) {
      return NextResponse.json(
        { message: "Data order item tidak valid" },
        { status: 400 },
      );
    }

    const orderId = `ORD-${crypto.randomUUID()}`;
    const pageExpiryMinutes = 5;
    const expiresAt = addMinutes(new Date(), pageExpiryMinutes).toISOString();

    const parameter = {
      transaction_details: {
        order_id: orderId,
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
        email: user.email,
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

    const { error: orderInsertError } = await supabase.from("orders").insert({
      order_id: orderId,
      user_id: authUser.id,
      payment_status: "pending",
      total_price: grossAmount,
      midtrans_token: token.token,
      midtrans_expire_at: expiresAt,
    });

    if (orderInsertError) {
      console.error("Insert orders error:", orderInsertError);
      return NextResponse.json(
        { message: "Gagal membuat order" },
        { status: 500 },
      );
    }

    const orderItemRows = normalizedItems
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map((item) => ({
        order_id: orderId,
        location_id: item.location_id,
        booking_start: item.booking_start,
        booking_end: item.booking_end,
        price: item.price,
        quantity: item.quantity,
      }));

    const { error: orderItemsInsertError } = await supabase
      .from("order_items")
      .insert(orderItemRows);

    if (orderItemsInsertError) {
      console.error("Insert order_items error:", orderItemsInsertError);
      await supabase.from("orders").delete().eq("order_id", orderId);
      return NextResponse.json(
        { message: "Gagal membuat order item" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      token: token.token,
      order_id: orderId,
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
