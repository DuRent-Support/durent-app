import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type OrderRow = {
  id: number;
  code: string;
  user_uuid: string;
  purpose: string | null;
  payment_status: string | null;
  grand_total_amount: string | number | null;
  created_at: string | null;
};

type OrderItemRow = {
  order_id: number;
  item_type: string | null;
  item_id: number;
  item_name_snapshot: string | null;
  quantity: number | null;
  unit_price_snapshot: string | number | null;
  line_total: string | number | null;
  booking_start: string | null;
  booking_end: string | null;
  is_from_bundle: boolean | null;
  bundle_id: number | null;
};

type ProfileRow = {
  user_uuid: string;
  full_name: string | null;
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

function normalizePaymentStatus(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) return "pending";
  if (normalized === "settlement") return "paid";
  if (
    normalized === "cancel" ||
    normalized === "deny" ||
    normalized === "expire"
  ) {
    return "failed";
  }

  return normalized;
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_uuid", user.id)
      .single<Pick<Profile, "role">>();

    if (profileError || profile?.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const serviceRoleClient = createServiceRoleClient();

    const { data: orderRows, error: orderError } = await serviceRoleClient
      .from("orders")
      .select(
        "id, code, user_uuid, purpose, payment_status, grand_total_amount, created_at",
      )
      .order("created_at", { ascending: false });

    if (orderError) {
      console.error("Fetch orders error:", orderError);
      return NextResponse.json(
        { message: "Gagal mengambil data order." },
        { status: 500 },
      );
    }

    const orders = (orderRows ?? []) as OrderRow[];

    if (orders.length === 0) {
      return NextResponse.json({ orders: [] }, { status: 200 });
    }

    const orderIds = orders.map((order) => order.id);
    const userUuids = [...new Set(orders.map((order) => order.user_uuid))];

    const [orderItemsResult, profilesResult] = await Promise.all([
      serviceRoleClient
        .from("order_items")
        .select(
          "order_id, item_type, item_id, item_name_snapshot, quantity, unit_price_snapshot, line_total, booking_start, booking_end, is_from_bundle, bundle_id",
        )
        .in("order_id", orderIds)
        .order("created_at", { ascending: true }),
      userUuids.length > 0
        ? serviceRoleClient
            .from("profiles")
            .select("user_uuid, full_name")
            .in("user_uuid", userUuids)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (orderItemsResult.error) {
      console.error("Fetch order_items error:", orderItemsResult.error);
      return NextResponse.json(
        { message: "Gagal mengambil detail order item." },
        { status: 500 },
      );
    }

    if (profilesResult.error) {
      console.error("Fetch profiles error:", profilesResult.error);
    }

    const profileNameMap = new Map<string, string>();
    ((profilesResult.data ?? []) as ProfileRow[]).forEach((row) => {
      const fullName = String(row.full_name ?? "").trim();
      if (fullName) {
        profileNameMap.set(row.user_uuid, fullName);
      }
    });

    const itemsByOrderId = new Map<number, OrderItemRow[]>();
    ((orderItemsResult.data ?? []) as OrderItemRow[]).forEach((item) => {
      const bucket = itemsByOrderId.get(item.order_id) ?? [];
      bucket.push(item);
      itemsByOrderId.set(item.order_id, bucket);
    });

    const mappedOrders = orders.map((order) => {
      const items = (itemsByOrderId.get(order.id) ?? []).map((item, index) => {
        const quantity = Math.max(1, Number(item.quantity ?? 1));
        const unitPrice = parseNumber(item.unit_price_snapshot);
        const lineTotal = Math.max(
          parseNumber(item.line_total),
          quantity * unitPrice,
        );

        return {
          id: `${order.code}-${item.item_type}-${item.item_id}-${index + 1}`,
          itemType: String(item.item_type ?? "item"),
          itemId: Number(item.item_id),
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
        };
      });

      return {
        id: order.id,
        orderCode: order.code,
        customerName:
          profileNameMap.get(order.user_uuid) ??
          `User ${String(order.user_uuid).slice(0, 8)}`,
        purpose: String(order.purpose ?? "").trim() || "Shooting",
        paymentStatus: normalizePaymentStatus(order.payment_status),
        createdAt: order.created_at,
        totalAmount: parseNumber(order.grand_total_amount),
        itemCount: items.length,
        items,
      };
    });

    return NextResponse.json({ orders: mappedOrders }, { status: 200 });
  } catch (error) {
    console.error("Get admin orders error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil data orders." },
      { status: 500 },
    );
  }
}
