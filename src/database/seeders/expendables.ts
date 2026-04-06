import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "./_shared";

type ExpendableRow = {
  code: string;
  name: string;
  description: string;
  price: number;
  is_available: boolean;
};

const expendableRows: ExpendableRow[] = [
  {
    code: "DS-ED-EP-BT-0001",
    name: "Daimaru Black Tape 48mm x 12m",
    description: "Black tape untuk kebutuhan set dan kabel.",
    price: 25000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-MT-0001",
    name: "Daimaru Masking Tape Cream 48mm x 21m",
    description: "Masking tape untuk marking dan kebutuhan set.",
    price: 25000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-PI-0001",
    name: "Plastik Ikan 40cm x 60cm (30pcs)",
    description: "Plastik pembungkus untuk kebutuhan produksi.",
    price: 20000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-PI-0002",
    name: "Plastik Ikan 60cm x 100cm (12pcs)",
    description: "Plastik pembungkus untuk kebutuhan produksi.",
    price: 20000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-PL-0001",
    name: "Plastik Sampah 60cm x 100cm (24 pcs )",
    description: "Plastik sampah untuk kebersihan lokasi.",
    price: 40000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-PL-0002",
    name: "Plastik Sampah 50cm x 60cm (102 pcs )",
    description: "Plastik sampah untuk kebersihan lokasi.",
    price: 45000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-CW-0001",
    name: "Cling Wrap 30m x 30cm",
    description: "Cling wrap untuk membungkus makanan dan peralatan.",
    price: 20000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-BC-0001",
    name: "Kenko Binder Clips No.200 Per Pack Isi 12 (41mm)",
    description: "Binder clip untuk kebutuhan administrasi.",
    price: 20000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-KK-0001",
    name: "Kertas Karton Hitam (1 Roll)",
    description: "Karton hitam untuk kebutuhan set dan props.",
    price: 5000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-PS-0001",
    name: "Pelindung Sepatu Silicone Anti Slip",
    description: "Pelindung sepatu anti slip untuk lokasi.",
    price: 35000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-BF-0001",
    name: "Bye Bye Fever (1Pcs)",
    description: "Kompres penurun demam praktis.",
    price: 15000,
    is_available: true,
  },
  {
    code: "DS-ED-AO-PP-0001",
    name: "Paket Obat 1",
    description: "Paket obat dasar untuk kebutuhan kru.",
    price: 50000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-GL-0001",
    name: "Paper Cup Polos 8 oz / Gelas kertas minuman panas (50Pcs)",
    description: "Gelas kertas untuk minuman panas.",
    price: 12500,
    is_available: true,
  },
  {
    code: "DS-ED-EP-SD-0001",
    name: "Sendok Plastik Bebek (120Pcs)",
    description: "Sendok plastik untuk kebutuhan katering.",
    price: 12000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-GL-0002",
    name: "Gelas Plastik Datar 16 oz (50Pcs)",
    description: "Gelas plastik untuk minuman dingin.",
    price: 12500,
    is_available: true,
  },
  {
    code: "DS-ED-EP-JH-0001",
    name: "Jas Hujan Plastik Ponco (12Pcs)",
    description: "Jas hujan plastik untuk kru di lokasi.",
    price: 45000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-TR-0001",
    name: "Terpal 3m x 5m",
    description: "Terpal untuk penutup peralatan di lokasi.",
    price: 35000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-TT-0001",
    name: "Daimaru Transparant Tape (Lakban Bening) 48mm x 100m",
    description: "Lakban bening untuk kebutuhan set dan logistik.",
    price: 25000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-TT-0002",
    name: "Daimaru Nano Double Tip Bening Gel 2cm x 3m",
    description: "Double tape gel bening untuk pemasangan.",
    price: 25000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-AT-0001",
    name: "Daimaru Anti Slip Tape (Anti Licin Tangga/ Lantai) 48mm x 5m",
    description: "Anti slip tape untuk keamanan lokasi.",
    price: 65000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-KB-0001",
    name: "Kawat Bendrat 1/2kg",
    description: "Kawat bendrat untuk kebutuhan set.",
    price: 35000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-BC-0002",
    name: "Kenko Binder Clips No.155 Per Pack isi 12 (32mm)",
    description: "Binder clip untuk kebutuhan administrasi.",
    price: 20000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-BC-0003",
    name: "Kenko Binder Clips No.260 Per Pack isi 12 (51mm)",
    description: "Binder clip untuk kebutuhan administrasi.",
    price: 25000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-BF-0002",
    name: "Bye Bye Fever Medium (10 pcs )",
    description: "Kompres penurun demam ukuran medium.",
    price: 135000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-BA-0001",
    name: "Baterai Alkaline AAA (8PCS)",
    description: "Baterai alkaline AAA untuk perangkat kecil.",
    price: 55000,
    is_available: true,
  },
  {
    code: "DS-ED-EP-BA-0002",
    name: "Baterai Alkaline AA (8PCS)",
    description: "Baterai alkaline AA untuk perangkat kecil.",
    price: 50000,
    is_available: true,
  },
];

export async function seedExpendables(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (expendableRows.length === 0) {
    return {
      table: "expendables",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const codes = expendableRows.map((row) => row.code);
  const { data: existingRows, error: selectError } = await supabase
    .from("expendables")
    .select("code")
    .in("code", codes);

  if (selectError) {
    throw new Error(`Select expendables failed: ${selectError.message}`);
  }

  const existingCodes = new Set(
    (existingRows ?? []).map((row) => String(row.code ?? "")),
  );

  const rowsToInsert = expendableRows
    .filter((row) => !existingCodes.has(row.code))
    .map((row) => ({
      uuid: randomUUID(),
      code: row.code,
      name: row.name,
      description: row.description,
      price: row.price,
      is_available: row.is_available,
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("expendables")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert expendables failed: ${insertError.message}`);
    }
  }

  return {
    table: "expendables",
    total: expendableRows.length,
    inserted: rowsToInsert.length,
    skipped: expendableRows.length - rowsToInsert.length,
  };
}
