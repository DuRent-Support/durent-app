import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type BaseInventoryRow = {
  code: string | null;
  name: string | null;
  price: number | null;
};

type InventoryItem = {
  code: string;
  name: string;
  price: number;
};

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

    const [
      locationsResult,
      crewsResult,
      rentalsResult,
      fnbResult,
      expendablesResult,
    ] = await Promise.all([
      serviceRoleClient.from("locations").select("code, name, price"),
      serviceRoleClient.from("crews").select("code, name, price"),
      serviceRoleClient.from("rentals").select("code, name, price"),
      serviceRoleClient.from("food_and_beverage").select("code, name, price"),
      serviceRoleClient.from("expendables").select("code, name, price"),
    ]);

    if (
      locationsResult.error ||
      crewsResult.error ||
      rentalsResult.error ||
      fnbResult.error ||
      expendablesResult.error
    ) {
      console.error("Fetch inventory union data error:", {
        locations: locationsResult.error,
        crews: crewsResult.error,
        rentals: rentalsResult.error,
        foodAndBeverage: fnbResult.error,
        expendables: expendablesResult.error,
      });

      return NextResponse.json(
        { message: "Gagal mengambil data inventory." },
        { status: 500 },
      );
    }

    const mergedItems = [
      ...((locationsResult.data ?? []) as BaseInventoryRow[]),
      ...((crewsResult.data ?? []) as BaseInventoryRow[]),
      ...((rentalsResult.data ?? []) as BaseInventoryRow[]),
      ...((fnbResult.data ?? []) as BaseInventoryRow[]),
      ...((expendablesResult.data ?? []) as BaseInventoryRow[]),
    ];

    const items: InventoryItem[] = mergedItems.map((item, index) => ({
      code: String(item.code ?? "").trim() || `NO-CODE-${index + 1}`,
      name: String(item.name ?? "").trim() || "Unnamed Item",
      price: Number.isFinite(Number(item.price)) ? Number(item.price) : 0,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Get admin inventory error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil inventory." },
      { status: 500 },
    );
  }
}
