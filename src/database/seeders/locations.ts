import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type LocationRow = {
  code: string;
  name: string;
  description: string;
  city: string;
  price: number;
  area: number;
  pax: number;
  is_available: boolean;
  rating: number;
};

const locationRows: LocationRow[] = [
  {
    code: "DR-LC-SE-ED-0001",
    name: "Rumah Mewah Menteng",
    description:
      "Rumah mewah dengan nuansa luxury cocok untuk iklan produk premium dan scene keluarga.",
    city: "Jakarta",
    price: 2500000,
    area: 450,
    pax: 30,
    is_available: true,
    rating: 0,
  },
  {
    code: "DR-LC-SE-ED-0003",
    name: "Apartemen Modern SCBD",
    description:
      "Apartemen modern di pusat kota dengan view skyline, cocok untuk iklan produk urban.",
    city: "Jakarta",
    price: 1200000,
    area: 120,
    pax: 10,
    is_available: true,
    rating: 0,
  },
  {
    code: "DR-LC-SE-ED-0004",
    name: "Gudang Industrial Bandung",
    description:
      "Lokasi bergaya industrial dengan nuansa vintage, cocok untuk video klip atau konten kreatif.",
    city: "Bandung",
    price: 900000,
    area: 500,
    pax: 40,
    is_available: true,
    rating: 0,
  },
  {
    code: "DR-LC-SE-ED-0005",
    name: "Rumah Klasik Surabaya",
    description:
      "Rumah klasik dengan desain elegan, cocok untuk scene keluarga dan iklan produk heritage.",
    city: "Surabaya",
    price: 1500000,
    area: 350,
    pax: 25,
    is_available: false,
    rating: 0,
  },
  {
    code: "DR-LC-SE-ED-0006",
    name: "Cafe Estetik Jogja",
    description:
      "Cafe dengan interior estetik dan instagramable, cocok untuk konten F&B dan social media.",
    city: "Yogyakarta",
    price: 800000,
    area: 200,
    pax: 15,
    is_available: true,
    rating: 0,
  },
];

export async function seedLocations(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (locationRows.length === 0) {
    return {
      table: "locations",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const codes = locationRows.map((row) => row.code);
  const { data: existingRows, error: selectError } = await supabase
    .from("locations")
    .select("code")
    .in("code", codes);

  if (selectError) {
    throw new Error(`Select locations failed: ${selectError.message}`);
  }

  const existingCodes = new Set(
    (existingRows ?? []).map((row) => String(row.code ?? "")),
  );

  const rowsToInsert = locationRows
    .filter((row) => !existingCodes.has(row.code))
    .map((row) => ({
      uuid: randomUUID(),
      code: row.code,
      name: row.name,
      description: row.description,
      city: row.city,
      price: row.price,
      area: row.area,
      pax: row.pax,
      is_available: row.is_available,
      rating: row.rating,
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("locations")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert locations failed: ${insertError.message}`);
    }
  }

  return {
    table: "locations",
    total: locationRows.length,
    inserted: rowsToInsert.length,
    skipped: locationRows.length - rowsToInsert.length,
  };
}
