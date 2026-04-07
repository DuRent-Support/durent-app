import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

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

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-2-preview",
  apiKey: process.env.GOOGLE_API_KEY,
});

function buildEmbeddingContent(row: LocationRow, tags: string[]) {
  return {
    name: row.name,
    city: row.city,
    price: String(row.price),
    description: row.description,
    area: row.area,
    pax: row.pax,
    rating: row.rating,
    tags,
    image_url: null as string | null,
  };
}

function buildContentString(content: ReturnType<typeof buildEmbeddingContent>) {
  const parts = [
    `Nama: ${content.name}.`,
    `Kota: ${content.city}.`,
    `Deskripsi: ${content.description}.`,
    content.tags.length > 0 ? `Tag: ${content.tags.join(", ")}.` : null,
    `Area: ${content.area}m².`,
    `Kapasitas: ${content.pax} orang.`,
    `Harga: ${content.price}.`,
    `Rating: ${content.rating}/5.`,
  ].filter(Boolean);

  return parts.join(" ");
}

async function loadTagsByLocationId(
  supabase: SupabaseClient,
  locationIds: number[],
) {
  const tagsByLocationId = new Map<number, string[]>();

  if (locationIds.length === 0) {
    return tagsByLocationId;
  }

  const { data: locationTags, error: locationTagsError } = await supabase
    .from("location_tag")
    .select("location_id, location_tag_id")
    .in("location_id", locationIds);

  if (locationTagsError) {
    throw new Error(
      `Select location tags failed: ${locationTagsError.message}`,
    );
  }

  const tagIds = Array.from(
    new Set((locationTags ?? []).map((row) => Number(row.location_tag_id))),
  ).filter((id) => Number.isFinite(id));

  if (tagIds.length === 0) {
    return tagsByLocationId;
  }

  const { data: tagRows, error: tagRowsError } = await supabase
    .from("location_tags")
    .select("id, name")
    .in("id", tagIds);

  if (tagRowsError) {
    throw new Error(`Select tags failed: ${tagRowsError.message}`);
  }

  const tagIdToName = new Map(
    (tagRows ?? []).map((row) => [Number(row.id), String(row.name)]),
  );

  for (const row of locationTags ?? []) {
    const locationId = Number(row.location_id);
    const tagId = Number(row.location_tag_id);
    const tagName = tagIdToName.get(tagId);
    if (!tagName) continue;
    const existing = tagsByLocationId.get(locationId) ?? [];
    existing.push(tagName);
    tagsByLocationId.set(locationId, existing);
  }

  return tagsByLocationId;
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

  const locationIds = [...codeToId.values()];
  const tagsByLocationId = await loadTagsByLocationId(supabase, locationIds);

  let inserted = 0;

  for (const row of locationRows) {
    const locationId = codeToId.get(row.code);
    if (!locationId) continue;

    const tags = tagsByLocationId.get(locationId) ?? [];
    const content = buildEmbeddingContent(row, tags);
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

  await seedLocationEmbeddings(supabase);

  return {
    table: "locations",
    total: locationRows.length,
    inserted: rowsToInsert.length,
    skipped: locationRows.length - rowsToInsert.length,
  };
}
