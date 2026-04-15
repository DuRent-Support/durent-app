import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-2-preview",
  apiKey: process.env.GOOGLE_API_KEY,
});

export interface LocationEmbeddingInput {
  location_id: string;
  name: string;
  city: string;
  price: string;
  description: string;
  area: number;
  pax: number;
  rating: number;
  tags: string[];
  image_url?: string;
}

function buildContentString(loc: LocationEmbeddingInput): string {
  const parts = [
    `Nama: ${loc.name}.`,
    `Kota: ${loc.city}.`,
    `Deskripsi: ${loc.description}.`,
    loc.tags.length > 0 ? `Tag: ${loc.tags.join(", ")}.` : null,
    `Area: ${loc.area}m².`,
    `Kapasitas: ${loc.pax} orang.`,
    `Harga: ${loc.price}.`,
    `Rating: ${loc.rating}/5.`,
  ].filter(Boolean);
  return parts.join(" ");
}

export interface LocationSearchResult {
  location_id: string;
  content: {
    name: string;
    city: string;
    price: string;
    description: string;
    area: number;
    pax: number;
    rating: number;
    tags: string[];
    image_url: string | null;
  };
  similarity: number;
}

export async function searchSimilarLocations(
  query: string,
  matchCount = 5,
  matchThreshold = 0.6,
): Promise<LocationSearchResult[]> {
  try {
    const vector = await embeddings.embedQuery(query);
    const supabase = await createClient();

    const { data, error } = await supabase.rpc("match_location_embeddings", {
      query_embedding: vector,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    console.log("Raw RPC response:", { data });

    if (error) {
      console.error("Vector search error:", error.message);
      return [];
    }

    const debug = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      similarity: r.similarity || r.distance, // tergantung RPC kamu
      city: r.metadata?.city,
    }));

    console.log(
      "RAG DEBUG:",
      JSON.stringify(
        {
          query,
          results: debug,
        },
        null,
        2,
      ),
    );
    return (data as LocationSearchResult[]) ?? [];
  } catch (err) {
    console.error("searchSimilarLocations failed:", err);
    return [];
  }
}

export async function upsertLocationEmbedding(
  loc: LocationEmbeddingInput,
): Promise<void> {
  try {
    const contentString = buildContentString(loc);
    const vector = await embeddings.embedQuery(contentString);

    const contentJson = {
      name: loc.name,
      city: loc.city,
      price: loc.price,
      description: loc.description,
      area: loc.area,
      pax: loc.pax,
      rating: loc.rating,
      tags: loc.tags,
      image_url: loc.image_url ?? null,
    };

    const supabase = await createClient();
    const { error } = await supabase.from("location_embeddings").upsert(
      {
        location_id: loc.location_id,
        content: contentJson,
        embedding: vector,
      },
      { onConflict: "location_id" },
    );

    if (error) {
      console.error("Upsert embedding error:", error.message);
    }
  } catch (err) {
    console.error("upsertLocationEmbedding failed:", err);
  }
}

export interface AdminLocationEmbeddingInput {
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

function buildAdminLocationContentString(
  loc: AdminLocationEmbeddingInput,
): string {
  const parts = [
    `Code: ${loc.code}.`,
    `Nama: ${loc.name}.`,
    `Kota: ${loc.city}.`,
    `Deskripsi: ${loc.description}.`,
    loc.tags.length > 0 ? `Tag: ${loc.tags.join(", ")}.` : null,
    loc.item_categories.length > 0
      ? `Item categories: ${loc.item_categories.join(", ")}.`
      : null,
    loc.item_sub_categories.length > 0
      ? `Item sub categories: ${loc.item_sub_categories.join(", ")}.`
      : null,
    `Area: ${loc.area}m².`,
    `Kapasitas: ${loc.pax} orang.`,
    `Harga: ${loc.price}.`,
    `Rating: ${loc.rating}/5.`,
    `Status: ${loc.is_available ? "available" : "unavailable"}.`,
  ].filter(Boolean);

  return parts.join(" ");
}

export async function insertAdminLocationEmbedding(
  loc: AdminLocationEmbeddingInput,
): Promise<void> {
  try {
    const contentString = buildAdminLocationContentString(loc);
    const vector = await embeddings.embedQuery(contentString);

    const contentJson = {
      code: loc.code,
      name: loc.name,
      city: loc.city,
      description: loc.description,
      price: loc.price,
      area: loc.area,
      pax: loc.pax,
      rating: loc.rating,
      is_available: loc.is_available,
      tags: loc.tags,
      item_categories: loc.item_categories,
      item_sub_categories: loc.item_sub_categories,
    };

    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("location_embeddings").insert({
      location_id: loc.location_id,
      content: contentJson,
      embedding: vector,
    });

    if (error) {
      console.error("Insert admin embedding error:", error.message);
    }
  } catch (err) {
    console.error("insertAdminLocationEmbedding failed:", err);
  }
}
