import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type PendingOrderRow = {
  id: number;
  code: string;
  grand_total_amount: string | number | null;
  payment_status: string | null;
  created_at: string | null;
  midtrans_token: string | null;
  midtrans_expires_at: string | null;
};

type PendingOrderItemRow = {
  order_id: number;
  item_id: number;
  item_name_snapshot: string | null;
  booking_start: string | null;
  booking_end: string | null;
  quantity: number | null;
  unit_price_snapshot: string | number | null;
};

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, code, grand_total_amount, payment_status, created_at, midtrans_token, midtrans_expires_at",
      )
      .eq("user_uuid", user.id)
      .eq("payment_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch pending payments error:", error);
      return NextResponse.json(
        { message: "Gagal mengambil data pembayaran pending" },
        { status: 500 },
      );
    }

    const baseRows = (data ?? []) as PendingOrderRow[];
    const pendingRows = baseRows.filter((row) => Boolean(row.midtrans_token));

    if (pendingRows.length === 0) {
      return NextResponse.json({ pendingPayments: [] }, { status: 200 });
    }

    const orderIds = pendingRows.map((row) => row.id);
    const { data: orderItemsData, error: orderItemsError } = await supabase
      .from("order_items")
      .select(
        "order_id, item_id, item_name_snapshot, booking_start, booking_end, quantity, unit_price_snapshot",
      )
      .in("order_id", orderIds);

    if (orderItemsError) {
      console.error("Fetch order items error:", orderItemsError);
      return NextResponse.json(
        {
          pendingPayments: pendingRows.map((row) => ({ ...row, items: [] })),
        },
        { status: 200 },
      );
    }

    const orderItems = (orderItemsData ?? []) as PendingOrderItemRow[];

    const enrichedRows = pendingRows.map((row) => ({
      order_id: row.code,
      total_price: row.grand_total_amount,
      payment_status: row.payment_status,
      created_at: row.created_at,
      midtrans_token: row.midtrans_token,
      midtrans_expire_at: row.midtrans_expires_at,
      items: orderItems
        .filter((item) => item.order_id === row.id)
        .map((item) => ({
          order_id: row.code,
          location_id: String(item.item_id),
          booking_start: item.booking_start ?? "",
          booking_end: item.booking_end ?? "",
          quantity: item.quantity,
          price: item.unit_price_snapshot,
          location_name:
            String(item.item_name_snapshot ?? "").trim() ||
            `Item ${item.item_id}`,
        })),
    }));

    return NextResponse.json(
      { pendingPayments: enrichedRows },
      { status: 200 },
    );
  } catch (error) {
    console.error("Pending payments API error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil pembayaran pending" },
      { status: 500 },
    );
  }
}
