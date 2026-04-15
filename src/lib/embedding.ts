import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-2-preview",
  apiKey: process.env.GOOGLE_API_KEY,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimilarLocation {
  location_id: number;
  content: {
    name: string;
    city: string;
    price: string;
    description: string;
    area: number;
    pax: number;
    image_url: string | null;
  };
  similarity: number;
}

export interface UpsertLocationEmbeddingParams {
  location_id: string | number;
  name: string;
  city: string;
  price: string;
  description: string;
  area: number;
  pax: number;
  rating: number;
  tags: string[];
  image_url?: string | null;
}

export interface InsertAdminLocationEmbeddingParams {
  location_id: number;
  code: string;
  name: string;
  city: string;
  description: string;
  price: number;
  area: number;
  pax: number;
  rating: number;
  is_available: boolean;
  tags: string[];
  item_categories: string[];
  item_sub_categories: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildEmbeddingContent(params: {
  name: string;
  city: string;
  price: string | number;
  description: string;
  area: number;
  pax: number;
  image_url?: string | null;
}) {
  return {
    name: params.name,
    city: params.city,
    price: String(params.price),
    description: params.description,
    area: params.area,
    pax: params.pax,
    image_url: params.image_url ?? null,
  };
}

function buildContentString(params: {
  name: string;
  city: string;
  description: string;
  area: number;
  pax: number;
  price: string | number;
  extra?: string[];
}): string {
  const parts = [
    `Nama: ${params.name}.`,
    `Kota: ${params.city}.`,
    `Deskripsi: ${params.description}.`,
    `Area: ${params.area}m².`,
    `Kapasitas: ${params.pax} orang.`,
    `Harga: ${params.price}.`,
    ...(params.extra ?? []),
  ].filter(Boolean);
  return parts.join(" ");
}

// ---------------------------------------------------------------------------
// Similarity search
// ---------------------------------------------------------------------------

export async function searchSimilarLocations(
  query: string,
  matchCount = 5,
  matchThreshold = 0.3,
): Promise<SimilarLocation[]> {
  const supabase = await createClient();
  const queryEmbedding = await embeddings.embedQuery(query);

  const { data, error } = await supabase.rpc("match_location_embeddings", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    match_threshold: matchThreshold,
  });

  if (error) {
    throw new Error(`Similarity search failed: ${error.message}`);
  }

  // Supabase may return `content` as a JSON string instead of a parsed object.
  // Parse it here so callers can always access loc.content.name etc. safely.
  return ((data ?? []) as Array<Omit<SimilarLocation, "content"> & { content: unknown }>).map(
    (row) => ({
      ...row,
      content:
        typeof row.content === "string"
          ? (JSON.parse(row.content) as SimilarLocation["content"])
          : (row.content as SimilarLocation["content"]),
    }),
  );
}

// ---------------------------------------------------------------------------
// Upsert embedding (public location routes — /api/locations)
// ---------------------------------------------------------------------------

export async function upsertLocationEmbedding(
  params: UpsertLocationEmbeddingParams,
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const contentString = buildContentString(params);
    const content = buildEmbeddingContent(params);
    const vector = await embeddings.embedQuery(contentString);

    await supabase.from("location_embeddings").upsert(
      {
        location_id: params.location_id,
        content,
        embedding: vector,
      },
      { onConflict: "location_id" },
    );
  } catch (error) {
    console.error("upsertLocationEmbedding error:", error);
  }
}

// ---------------------------------------------------------------------------
// Insert embedding (admin location routes — /api/admin/locations)
// ---------------------------------------------------------------------------

export async function insertAdminLocationEmbedding(
  params: InsertAdminLocationEmbeddingParams,
): Promise<void> {
  try {
    const supabase = createServiceRoleClient();

    const extra: string[] = [];
    if (params.tags.length > 0)
      extra.push(`Tag: ${params.tags.join(", ")}.`);
    if (params.item_categories.length > 0)
      extra.push(`Kategori: ${params.item_categories.join(", ")}.`);
    if (params.item_sub_categories.length > 0)
      extra.push(`Sub-kategori: ${params.item_sub_categories.join(", ")}.`);

    const contentString = buildContentString({
      name: params.name,
      city: params.city,
      description: params.description,
      area: params.area,
      pax: params.pax,
      price: params.price,
      extra,
    });

    const content = buildEmbeddingContent({
      name: params.name,
      city: params.city,
      price: params.price,
      description: params.description,
      area: params.area,
      pax: params.pax,
    });

    const vector = await embeddings.embedQuery(contentString);

    await supabase.from("location_embeddings").upsert(
      {
        location_id: params.location_id,
        content,
        embedding: vector,
      },
      { onConflict: "location_id" },
    );
  } catch (error) {
    console.error("insertAdminLocationEmbedding error:", error);
  }
}
