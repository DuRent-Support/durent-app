import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import { type SeederResult } from "../_shared";

type RentalRow = {
  code: string;
  name: string;
  description: string;
  price: number;
  specifications: Record<string, unknown> | null;
  is_available: boolean;
};

const rentalRows: RentalRow[] = [
  {
    code: "DS-RT-CM-HT-0001",
    name: "HT WLN KD C1",
    description: "Perangkat komunikasi HT untuk koordinasi produksi.",
    price: 20000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-CM-HT-0002",
    name: "Earpiece",
    description: "Earpiece untuk HT dan komunikasi kru.",
    price: 5000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-CM-HT-0003",
    name: "Premium Earpiece WLN KD C1",
    description: "Earpiece premium untuk kenyamanan komunikasi.",
    price: 8000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-CM-SC-0001",
    name: "HOLLYLAND Solidcom SE 2.4 GHz - 4S",
    description: "Intercom wireless 2.4 GHz untuk kru produksi.",
    price: 350000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-CM-SC-0002",
    name: "HOLLYLAND Solidcom SE 2.4 GHz - 5S",
    description: "Intercom wireless 2.4 GHz untuk kru produksi.",
    price: 435000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-CM-SC-0003",
    name: "HOLLYLAND Solidcom SE 2.4 GHz - 9S",
    description: "Intercom wireless 2.4 GHz untuk kru produksi.",
    price: 600000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-MD-PP-0001",
    name: "P3K Package (Emergency set)",
    description: "Paket P3K untuk kebutuhan darurat di lokasi.",
    price: 150000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-MJ-0001",
    name: "Meja Lipat 122 Cm",
    description: "Meja lipat untuk kebutuhan produksi.",
    price: 32000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-MJ-0002",
    name: "Meja Lipat 180 Cm Portable",
    description: "Meja lipat portable untuk kebutuhan produksi.",
    price: 34000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-MJ-0003",
    name: "Meja Lipat 182 Cm",
    description: "Meja lipat untuk area kru dan talent.",
    price: 36000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-KS-0001",
    name: "Kursi Plastik Bakso",
    description: "Kursi plastik untuk kebutuhan kru.",
    price: 5000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-KS-0002",
    name: "Kursi Lipat Putih",
    description: "Kursi lipat untuk kru dan talent.",
    price: 20000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-KS-0003",
    name: "Kursi Lipat Director",
    description: "Kursi lipat khusus director.",
    price: 25000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-KS-0004",
    name: "Kursi Lipat Client / Talent",
    description: "Kursi lipat untuk client atau talent.",
    price: 45000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-TD-0001",
    name: "Tenda Lipat 3x3m + Dinding 3 Sisi",
    description: "Tenda lipat untuk kebutuhan area kru.",
    price: 120000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-TD-0002",
    name: "Tenda Lipat 3x3m + Dinding 4 Sisi",
    description: "Tenda lipat untuk kebutuhan area kru.",
    price: 140000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-TD-0003",
    name: "Tenda Lipat 3x6m + Dinding 3 Sisi",
    description: "Tenda lipat untuk kebutuhan area kru.",
    price: 230000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-LP-0001",
    name: "Lampu Tenda LED Waterproff 10W",
    description: "Lampu tenda LED untuk penerangan area.",
    price: 5000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-KA-0001",
    name: "Kipas Angin Blower 18",
    description: "Kipas angin blower untuk sirkulasi udara.",
    price: 25000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-CB-0001",
    name: "Cooler Box 100L",
    description: "Cooler box untuk penyimpanan makanan/minuman.",
    price: 50000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-CB-0002",
    name: "Cooler Box 60L",
    description: "Cooler box untuk penyimpanan makanan/minuman.",
    price: 35000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-WB-0001",
    name: "Water Boiler 20L",
    description: "Water boiler untuk kebutuhan air panas.",
    price: 100000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-WJ-0001",
    name: "Water Tank Jug 12L",
    description: "Water tank jug untuk suplai air.",
    price: 45000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-TP-0001",
    name: "Termos Pemanas Air Listrik 2L",
    description: "Termos pemanas air listrik untuk kebutuhan kru.",
    price: 25000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-DG-0001",
    name: "Pompa Galon Air Minum Electric / Waterpum",
    description: "Pompa galon elektrik untuk air minum.",
    price: 15000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-DG-0002",
    name: "Dispenser Meja Galon Panas dan Normal",
    description: "Dispenser meja untuk air panas dan normal.",
    price: 100000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-NP-0001",
    name: "Nespresso Coffee Machine Capsule 1500W",
    description: "Mesin kopi capsule untuk kebutuhan kru.",
    price: 350000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-RB-0001",
    name: "Rice/Ice Bucket 38L",
    description: "Bucket serbaguna untuk nasi atau es.",
    price: 30000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-RB-0002",
    name: "Rice/Ice Bucket 17L",
    description: "Bucket serbaguna untuk nasi atau es.",
    price: 20000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-TB-0001",
    name: "Troli Barang 3 Susun / Meja Director Hitam",
    description: "Troli barang untuk membawa peralatan.",
    price: 100000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-TB-0002",
    name: "Troli Barang Besi Kapasitas 150kg",
    description: "Troli barang besi kapasitas besar.",
    price: 50000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-ET-KR-0001",
    name: "Kabel Roll 4 Soket - 25m 10A",
    description: "Kabel roll untuk distribusi listrik.",
    price: 30000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-ET-KR-0002",
    name: "Kabel Roll 4 Soket - 12m 10A",
    description: "Kabel roll untuk distribusi listrik.",
    price: 20000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-ET-KT-0001",
    name: "Kabel Terminal 5 Soket - 1,5m",
    description: "Kabel terminal untuk sambungan listrik.",
    price: 5000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-ET-KT-0002",
    name: "Kabel Terminal 6 Soket - 1,4m 16A",
    description: "Kabel terminal untuk sambungan listrik.",
    price: 15000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-ET-PB-0001",
    name: "Panel Box + Power Cable 50m 16A",
    description: "Panel box untuk distribusi daya.",
    price: 250000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PW-GS-0001",
    name: "Genset 6.5kva 6500W  Silent Portable (Exclude BBM) + Panel Box",
    description: "Genset silent portable untuk kebutuhan listrik.",
    price: 650000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PW-GS-0002",
    name: "Genset 3kva 3000W Silent Portable (Exclude BBM)",
    description: "Genset silent portable untuk kebutuhan listrik.",
    price: 500000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PW-GS-0003",
    name: "Genset 2.2 KW 2400W Silent Portable (Exclude BBM)",
    description: "Genset silent portable untuk kebutuhan listrik.",
    price: 350000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PW-TK-0001",
    name: "Tangki /Jerigen Besi BBM Bensin 20L (Exclude BBM)",
    description: "Jerigen besi untuk penyimpanan BBM.",
    price: 50000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PW-TK-0002",
    name: "Tangki /Jerigen Besi BBM Bensin 20L (Full tank Pertamax)",
    description: "Jerigen besi dengan BBM penuh.",
    price: 350000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-SF-GC-0001",
    name: "Ground Cable Protectors 1m / Pelindung Kabel Jalan",
    description: "Pelindung kabel untuk keamanan area jalan.",
    price: 45000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-SF-GC-0002",
    name: "Ground Cable Protectors 2m / Pelindung Kabel Jalan",
    description: "Pelindung kabel untuk keamanan area jalan.",
    price: 80000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-SF-GC-0003",
    name: "Ground Cable Protectors 5m / Pelindung Kabel Jalan",
    description: "Pelindung kabel untuk keamanan area jalan.",
    price: 200000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-SF-ST-0001",
    name: "Safety Traffic Cone 70cm",
    description: "Traffic cone untuk pengamanan area.",
    price: 20000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-SF-TL-0001",
    name: "Traffic Light Ref Baton - 54cm",
    description: "Baton lampu untuk pengaturan lalu lintas.",
    price: 15000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-OT-TM-0001",
    name: "TOA Megaphone Putih 20W",
    description: "Megaphone untuk pengarahan kru.",
    price: 50000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-OT-SG-0001",
    name: "Smoke Gun / Fog Machine 500watt Include 350ml liquid",
    description: "Fog machine untuk efek visual.",
    price: 150000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-OT-SG-0002",
    name: "Smoke Gun / Fog Machine 900watt Include 350ml liquid",
    description: "Fog machine untuk efek visual.",
    price: 250000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-OT-SB-0001",
    name: "Speaker Bluetooth JBL FLIP 5",
    description: "Speaker bluetooth untuk kebutuhan audio.",
    price: 100000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-TP-PT-0001",
    name: "Pickup Truck (Mobil Bak Terbuka) all-in Jakarta",
    description: "Mobil pickup untuk pengiriman area Jakarta.",
    price: 650000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-TP-PT-0002",
    name: "Pickup Truck (Mobil Bak Terbuka) all-in Outside Jakarta",
    description: "Mobil pickup untuk pengiriman luar Jakarta.",
    price: 1200000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-AO-TC-0001",
    name: "Table Cover",
    description: "Table cover untuk kebutuhan produksi.",
    price: 20000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-TP-PT-0003",
    name: "Biaya Pengiriman",
    description: "Biaya pengiriman peralatan.",
    price: 120000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-LP-0002",
    name: "Lampu Tenda LED Waterproff 10W (Package 12 pcs)",
    description: "Paket lampu tenda LED 12 pcs.",
    price: 50000,
    specifications: null,
    is_available: true,
  },
  {
    code: "DS-RT-PU-SP-0001",
    name: "Shooting Package",
    description: "Paket kebutuhan shooting standar.",
    price: 835000,
    specifications: null,
    is_available: true,
  },
];

export async function seedRentals(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (rentalRows.length === 0) {
    return {
      table: "rentals",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const codes = rentalRows.map((row) => row.code);
  const { data: existingRows, error: selectError } = await supabase
    .from("rentals")
    .select("code")
    .in("code", codes);

  if (selectError) {
    throw new Error(`Select rentals failed: ${selectError.message}`);
  }

  const existingCodes = new Set(
    (existingRows ?? []).map((row) => String(row.code ?? "")),
  );

  const rowsToInsert = rentalRows
    .filter((row) => !existingCodes.has(row.code))
    .map((row) => ({
      uuid: randomUUID(),
      code: row.code,
      name: row.name,
      description: row.description,
      price: row.price,
      specifications: row.specifications,
      is_available: row.is_available,
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("rentals")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert rentals failed: ${insertError.message}`);
    }
  }

  return {
    table: "rentals",
    total: rentalRows.length,
    inserted: rowsToInsert.length,
    skipped: rentalRows.length - rowsToInsert.length,
  };
}
