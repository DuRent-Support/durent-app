"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AppCardType } from "@/types/app-card";

export type ImageItem = { url: string; position: number };

export type ReviewItem = {
  user_uuid: string;
  rating: number;
  comment: string;
  profiles?: { full_name: string } | null;
};

export type BundleLineItem = {
  quantity: number;
  notes?: string | null;
  item: { name: string; price: number };
};

export type LocationDetail = {
  type: AppCardType.Location;
  id: number;
  name: string;
  description: string;
  city: string;
  price: number;
  area: number;
  pax: number;
  rating: number | null;
  images: ImageItem[];
  reviews: ReviewItem[];
};

export type RentalDetail = {
  type: AppCardType.Rental;
  id: number;
  name: string;
  description: string;
  price: number;
  specifications: Record<string, string>[];
  images: ImageItem[];
};

export type CrewDetail = {
  type: AppCardType.Crew;
  id: number;
  name: string;
  description: string;
  price: number;
  images: ImageItem[];
};

export type FnbDetail = {
  type: AppCardType.Fnb;
  id: number;
  name: string;
  description: string;
  price: number;
  images: ImageItem[];
};

export type ExpendableDetail = {
  type: AppCardType.Expendable;
  id: number;
  name: string;
  description: string;
  price: number;
  images: ImageItem[];
};

export type BundleDetail = {
  type: AppCardType.Bundle;
  id: number;
  name: string;
  description: string;
  base_price: number;
  final_price: number;
  images: ImageItem[];
  bundle_rentals: BundleLineItem[];
  bundle_crews: BundleLineItem[];
  bundle_food_and_beverage: BundleLineItem[];
  bundle_expendables: BundleLineItem[];
};

export type ItemDetail =
  | LocationDetail
  | RentalDetail
  | CrewDetail
  | FnbDetail
  | ExpendableDetail
  | BundleDetail;

const MEDIA_BUCKET = "media";
const SIGNED_URL_EXPIRY = 60 * 60;

async function resolveImageUrls(
  supabase: ReturnType<typeof createClient>,
  images: ImageItem[],
): Promise<ImageItem[]> {
  if (images.length === 0) return images;
  return Promise.all(
    images.map(async (img) => {
      if (!img.url || img.url.startsWith("http")) return img;
      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .createSignedUrl(img.url, SIGNED_URL_EXPIRY);
      return { ...img, url: error || !data ? img.url : data.signedUrl };
    }),
  );
}

export function useItemDetail(
  id: number | null,
  type: AppCardType | null,
  enabled: boolean,
) {
  const [data, setData] = useState<ItemDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !type || !enabled) {
      setData(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    async function fetchDetail() {
      setIsLoading(true);
      setError(null);
      try {
        let result: ItemDetail | null = null;

        if (type === AppCardType.Location) {
          const [locationRes, imagesRes, reviewsRes] = await Promise.all([
            supabase
              .from("locations")
              .select("id, name, description, city, price, area, pax, rating")
              .eq("id", id)
              .single(),
            supabase
              .from("location_images")
              .select("url, position")
              .eq("location_id", id)
              .order("position"),
            supabase
              .from("location_reviews")
              .select("user_uuid, rating, comment, profiles(full_name)")
              .eq("location_id", id)
              .order("created_at", { ascending: false }),
          ]);

          if (locationRes.error) throw locationRes.error;

          result = {
            type: AppCardType.Location,
            ...locationRes.data,
            images: imagesRes.data ?? [],
            reviews: (reviewsRes.data ?? []) as unknown as ReviewItem[],
          };
        } else if (type === AppCardType.Rental) {
          const [rentalRes, imagesRes] = await Promise.all([
            supabase
              .from("rentals")
              .select("id, name, description, price, specifications")
              .eq("id", id)
              .single(),
            supabase
              .from("rental_images")
              .select("url, position")
              .eq("rental_id", id)
              .order("position"),
          ]);

          if (rentalRes.error) throw rentalRes.error;

          result = {
            type: AppCardType.Rental,
            ...rentalRes.data,
            specifications: rentalRes.data.specifications ?? [],
            images: imagesRes.data ?? [],
          };
        } else if (type === AppCardType.Crew) {
          const [crewRes, imagesRes] = await Promise.all([
            supabase
              .from("crews")
              .select("id, name, description, price")
              .eq("id", id)
              .single(),
            supabase
              .from("crew_images")
              .select("url, position")
              .eq("crew_id", id)
              .order("position"),
          ]);

          if (crewRes.error) throw crewRes.error;

          result = {
            type: AppCardType.Crew,
            ...crewRes.data,
            images: imagesRes.data ?? [],
          };
        } else if (type === AppCardType.Fnb) {
          const [fnbRes, imagesRes] = await Promise.all([
            supabase
              .from("food_and_beverage")
              .select("id, name, description, price")
              .eq("id", id)
              .single(),
            supabase
              .from("food_and_beverage_images")
              .select("url, position")
              .eq("food_and_beverage_id", id)
              .order("position"),
          ]);

          if (fnbRes.error) throw fnbRes.error;

          result = {
            type: AppCardType.Fnb,
            ...fnbRes.data,
            images: imagesRes.data ?? [],
          };
        } else if (type === AppCardType.Expendable) {
          const [expRes, imagesRes] = await Promise.all([
            supabase
              .from("expendables")
              .select("id, name, description, price")
              .eq("id", id)
              .single(),
            supabase
              .from("expendable_images")
              .select("url, position")
              .eq("expendable_id", id)
              .order("position"),
          ]);

          if (expRes.error) throw expRes.error;

          result = {
            type: AppCardType.Expendable,
            ...expRes.data,
            images: imagesRes.data ?? [],
          };
        } else if (type === AppCardType.Bundle) {
          const [bundleRes, imagesRes, rentalsRes, crewsRes, fnbRes, expRes] =
            await Promise.all([
              supabase
                .from("bundles")
                .select("id, name, description, base_price, final_price")
                .eq("id", id)
                .single(),
              supabase
                .from("bundle_images")
                .select("url, position")
                .eq("bundle_id", id)
                .order("position"),
              supabase
                .from("bundle_rentals")
                .select("quantity, notes, rentals(name, price)")
                .eq("bundle_id", id),
              supabase
                .from("bundle_crews")
                .select("quantity, notes, crews(name, price)")
                .eq("bundle_id", id),
              supabase
                .from("bundle_food_and_beverage")
                .select("quantity, notes, food_and_beverage(name, price)")
                .eq("bundle_id", id),
              supabase
                .from("bundle_expendables")
                .select("quantity, notes, expendables(name, price)")
                .eq("bundle_id", id),
            ]);

          if (bundleRes.error) throw bundleRes.error;

          result = {
            type: AppCardType.Bundle,
            ...bundleRes.data,
            images: imagesRes.data ?? [],
            bundle_rentals: (rentalsRes.data ?? []).map((r) => ({
              quantity: r.quantity,
              notes: r.notes,
              item: r.rentals as unknown as { name: string; price: number },
            })),
            bundle_crews: (crewsRes.data ?? []).map((c) => ({
              quantity: c.quantity,
              notes: c.notes,
              item: c.crews as unknown as { name: string; price: number },
            })),
            bundle_food_and_beverage: (fnbRes.data ?? []).map((f) => ({
              quantity: f.quantity,
              notes: f.notes,
              item: f.food_and_beverage as unknown as { name: string; price: number },
            })),
            bundle_expendables: (expRes.data ?? []).map((e) => ({
              quantity: e.quantity,
              notes: e.notes,
              item: e.expendables as unknown as { name: string; price: number },
            })),
          };
        }

        if (!cancelled && result) {
          result.images = await resolveImageUrls(supabase, result.images);
          setData(result);
        }
      } catch {
        if (!cancelled) setError("Gagal memuat detail");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [id, type, enabled]);

  return { data, isLoading, error };
}
