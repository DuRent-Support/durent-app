import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import { type SeederResult } from "../_shared";

type LocationRow = {
  code: string;
  name: string;
  description: string;
  city: string;
  price: number;
  area: number;
  pax: number;
};

const locationRows: LocationRow[] = [
  {
    code: "DS-LC-ID-RK-0001",
    name: "Rumah Kaum No.8 Ciawi",
    description:
      "Rumah di Ciawi dengan nuansa semi-pedesaan, cocok untuk adegan keluarga atau transisi kota–alam, dengan latar hijau dan suasana tenang.",
    city: "Bogor",
    price: 1000000,
    area: 300,
    pax: 20,
  },
  {
    code: "DS-LC-ID-RK-0002",
    name: "Rumah Komplek Keuangan, Cipete",
    description:
      "Hunian di Cipete dengan karakter urban-middle class, cocok untuk adegan kehidupan kota yang realistis dan padat.",
    city: "Jakarta",
    price: 1000000,
    area: 200,
    pax: 15,
  },
  {
    code: "DS-LC-ID-RV-0001",
    name: "Rumah Villa Colibah, Puncak",
    description:
      "Villa di Puncak dengan view pegunungan dan kabut, ideal untuk mood dramatis, reflektif, atau romantis.",
    city: "Puncak",
    price: 1000000,
    area: 500,
    pax: 25,
  },
  {
    code: "DS-LC-ID-RS-0001",
    name: "Grand Aston Puncak",
    description:
      "Hotel modern di Puncak dengan fasilitas lengkap dan tampilan mewah, cocok untuk setting profesional, bisnis, atau liburan kelas atas.",
    city: "Puncak",
    price: 1000000,
    area: 2000,
    pax: 100,
  },
  {
    code: "DS-LC-ID-RK-0003",
    name: "Rumah Pematang Pauh",
    description:
      "Rumah di Pematang Pauh dengan nuansa lokal dan lanskap perbukitan, cocok untuk cerita bernuansa daerah atau budaya.",
    city: "Bogor",
    price: 1000000,
    area: 350,
    pax: 20,
  },
  {
    code: "DS-LC-ID-RS-0002",
    name: "Artee Resort Bogor",
    description:
      "Resort di Bogor dengan konsep alam terbuka, cocok untuk adegan santai, gathering, atau healing scene.",
    city: "Bogor",
    price: 1000000,
    area: 1500,
    pax: 80,
  },
  {
    code: "DS-LC-OD-JL-0001",
    name: "Jl. Fatmawati Raya Opsi Jalan Travling",
    description:
      "Jalan utama di Fatmawati Raya dengan lalu lintas aktif dan visual kota, cocok untuk scene perjalanan, establishing shot urban.",
    city: "Jakarta",
    price: 1000000,
    area: 1000,
    pax: 50,
  },
  {
    code: "DS-LC-OD-JL-0002",
    name: "Kampung Cina, Cibubur",
    description:
      "Area tematik di Cibubur dengan ornamen budaya Tionghoa, cocok untuk visual unik, colorful, atau setting budaya.",
    city: "Cibubur",
    price: 1000000,
    area: 800,
    pax: 40,
  },
  {
    code: "DS-LC-ID-RT-0001",
    name: "Kencana Resto Bogor",
    description:
      "Restoran di Bogor dengan ambience santai, cocok untuk adegan dialog, meeting, atau social interaction.",
    city: "Bogor",
    price: 1000000,
    area: 300,
    pax: 30,
  },
  {
    code: "DS-LC-ID-RT-0002",
    name: "Kopi Tiam 1",
    description:
      "Kedai kopi bergaya klasik, cocok untuk scene ngobrol santai, intimate conversation, atau slice-of-life.",
    city: "Jakarta",
    price: 1000000,
    area: 150,
    pax: 15,
  },
  {
    code: "DS-LC-ID-TI-0001",
    name: "Masjid At Tin TMII",
    description:
      "Masjid megah di Taman Mini Indonesia Indah, cocok untuk establishing shot religius atau momen reflektif.",
    city: "Jakarta",
    price: 1000000,
    area: 2000,
    pax: 200,
  },
  {
    code: "DS-LC-ID-RT-0003",
    name: "Penalama Kopi, Bogor",
    description:
      "Coffee shop di Bogor dengan potensi view alam, cocok untuk scene santai dengan visual estetik.",
    city: "Bogor",
    price: 1000000,
    area: 200,
    pax: 20,
  },
  {
    code: "DS-LC-ID-RK-0004",
    name: "Rumah Cikuray 25, Bogor",
    description:
      "Rumah di Bogor dengan karakter perumahan kota, fleksibel untuk berbagai adegan domestik.",
    city: "Bogor",
    price: 1000000,
    area: 250,
    pax: 15,
  },
  {
    code: "DS-LC-ID-RK-0005",
    name: "Rumah Damansara",
    description:
      "Hunian di Damansara dengan nuansa suburban modern, cocok untuk setting keluarga mapan atau internasional.",
    city: "Jakarta",
    price: 1000000,
    area: 400,
    pax: 25,
  },
  {
    code: "DS-LC-ID-RK-0006",
    name: "Rumah Pak Iyan",
    description:
      "Rumah dengan nuansa lokal dan personal, cocok untuk adegan autentik berbasis karakter atau kehidupan sehari-hari.",
    city: "Bogor",
    price: 1000000,
    area: 200,
    pax: 15,
  },
  {
    code: "DS-LC-ID-RK-0007",
    name: "Rumah Putih, Jagakarsa",
    description:
      "Hunian di Jagakarsa dengan suasana lebih hijau dan tenang, cocok untuk adegan keluarga atau drama ringan.",
    city: "Jakarta",
    price: 1000000,
    area: 300,
    pax: 20,
  },
  {
    code: "DS-LC-ID-RN-0001",
    name: "Rusun, Lebak Bulus",
    description:
      "Hunian vertikal di Lebak Bulus dengan karakter padat dan urban, cocok untuk cerita sosial atau realisme kota.",
    city: "Jakarta",
    price: 1000000,
    area: 150,
    pax: 20,
  },
  {
    code: "DS-LC-ID-TI-0002",
    name: "Wihara",
    description:
      "Tempat ibadah Buddha dengan suasana hening dan sakral, cocok untuk adegan refleksi, spiritual, atau visual simbolik.",
    city: "Jakarta",
    price: 1000000,
    area: 500,
    pax: 50,
  },
];

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-2-preview",
  apiKey: process.env.GOOGLE_API_KEY,
});

function buildEmbeddingContent(row: LocationRow) {
  return {
    name: row.name,
    city: row.city,
    price: String(row.price),
    description: row.description,
    area: row.area,
    pax: row.pax,
    image_url: null as string | null,
  };
}

function buildContentString(content: ReturnType<typeof buildEmbeddingContent>) {
  const parts = [
    `Nama: ${content.name}.`,
    `Kota: ${content.city}.`,
    `Deskripsi: ${content.description}.`,
    `Area: ${content.area}m².`,
    `Kapasitas: ${content.pax} orang.`,
    `Harga: ${content.price}.`,
  ].filter(Boolean);

  return parts.join(" ");
}

export async function seedLocationEmbeddings(
  supabase: SupabaseClient,
): Promise<SeederResult> {
  if (locationRows.length === 0) {
    return {
      table: "location_embeddings",
      total: 0,
      inserted: 0,
      skipped: 0,
    };
  }

  const codes = locationRows.map((row) => row.code);
  const { data: seededLocations, error: seededError } = await supabase
    .from("locations")
    .select("id, code")
    .in("code", codes);

  if (seededError) {
    throw new Error(`Select seeded locations failed: ${seededError.message}`);
  }

  const codeToId = new Map(
    (seededLocations ?? []).map((row) => [String(row.code), Number(row.id)]),
  );

  let inserted = 0;

  for (const row of locationRows) {
    const locationId = codeToId.get(row.code);
    if (!locationId) continue;

    const content = buildEmbeddingContent(row);
    const contentString = buildContentString(content);
    const vector = await embeddings.embedQuery(contentString);

    const { error: embeddingError } = await supabase
      .from("location_embeddings")
      .upsert(
        {
          location_id: locationId,
          content,
          embedding: vector,
        },
        { onConflict: "location_id" },
      );

    if (embeddingError) {
      throw new Error(
        `Insert location embedding failed (${row.code}): ${embeddingError.message}`,
      );
    }

    inserted += 1;
  }

  return {
    table: "location_embeddings",
    total: locationRows.length,
    inserted,
    skipped: locationRows.length - inserted,
  };
}

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
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("locations")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Insert locations failed: ${insertError.message}`);
    }
  }

  await seedLocationEmbeddings(supabase);

  return {
    table: "locations",
    total: locationRows.length,
    inserted: rowsToInsert.length,
    skipped: locationRows.length - rowsToInsert.length,
  };
}
