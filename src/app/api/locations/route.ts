import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { upsertLocationEmbedding } from "@/lib/embedding";

// GET all locations
export async function GET() {
  try {
    const serviceRoleClient = createServiceRoleClient();

    const { data: locations, error } = await serviceRoleClient
      .from("locations")
      .select(
        "id, name, city, price, description, area, pax, rating, updated_at",
      )
      .order("updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const locationIds = (locations ?? []).map((loc) => Number(loc.id));
    if (locationIds.length === 0) {
      return NextResponse.json({ locations: [] }, { status: 200 });
    }

    const [tagPivotResult, tagsResult, imagesResult] = await Promise.all([
      serviceRoleClient
        .from("location_tag")
        .select("location_id, location_tag_id")
        .in("location_id", locationIds),
      serviceRoleClient.from("location_tags").select("id, name"),
      serviceRoleClient
        .from("location_images")
        .select("location_id, url, position")
        .in("location_id", locationIds)
        .order("position", { ascending: true }),
    ]);

    if (tagPivotResult.error) {
      return NextResponse.json(
        { error: tagPivotResult.error.message },
        { status: 400 },
      );
    }
    if (tagsResult.error) {
      return NextResponse.json(
        { error: tagsResult.error.message },
        { status: 400 },
      );
    }
    if (imagesResult.error) {
      return NextResponse.json(
        { error: imagesResult.error.message },
        { status: 400 },
      );
    }

    const tagsById = new Map<number, string>();
    (tagsResult.data ?? []).forEach((row) => {
      tagsById.set(Number(row.id), String(row.name ?? ""));
    });

    const imagePaths = Array.from(
      new Set(
        (imagesResult.data ?? [])
          .map((row) => String(row.url ?? "").trim())
          .filter((url) => url.length > 0),
      ),
    );

    const signedMap = new Map<string, string>();
    if (imagePaths.length > 0) {
      const signedResult = await serviceRoleClient.storage
        .from("media")
        .createSignedUrls(imagePaths, 60 * 60);

      if (!signedResult.error) {
        (signedResult.data ?? []).forEach((item, index) => {
          if (!item.error && item.signedUrl) {
            signedMap.set(imagePaths[index], item.signedUrl);
          }
        });
      }
    }

    const locationsWithTags = locations?.map((loc) => ({
      shooting_location_id: String(loc.id),
      shooting_location_name: String(loc.name ?? ""),
      shooting_location_city: String(loc.city ?? ""),
      shooting_location_price: String(loc.price ?? 0),
      shooting_location_description: String(loc.description ?? ""),
      shooting_location_area: Number(loc.area ?? 0),
      shooting_location_pax: Number(loc.pax ?? 0),
      shooting_location_rate:
        typeof loc.rating === "number" ? loc.rating : Number(loc.rating ?? 0),
      shooting_location_image_url: (imagesResult.data ?? [])
        .filter((row) => Number(row.location_id) === Number(loc.id))
        .map((row) => {
          const path = String(row.url ?? "");
          return signedMap.get(path) ?? path;
        }),
      tags: (tagPivotResult.data ?? [])
        .filter((pivot) => Number(pivot.location_id) === Number(loc.id))
        .map((pivot) => tagsById.get(Number(pivot.location_tag_id)) || "")
        .filter((tag) => tag.length > 0),
      created_at: loc.updated_at,
    }));

    return NextResponse.json({ locations: locationsWithTags }, { status: 200 });
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data locations" },
      { status: 500 },
    );
  }
}

// POST create new location
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const price = formData.get("price") as string;
    const description = formData.get("description") as string;
    const area = parseFloat(formData.get("area") as string) || 0;
    const pax = parseInt(formData.get("pax") as string) || 0;
    const rate = parseFloat(formData.get("rate") as string) || 0;
    const tags = JSON.parse((formData.get("tags") as string) || "[]");

    // Get all image files
    const imageFiles: File[] = [];
    let index = 0;
    while (formData.has(`image_${index}`)) {
      const file = formData.get(`image_${index}`) as File;
      if (file && file.size > 0) {
        imageFiles.push(file);
      }
      index++;
    }

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nama lokasi tidak boleh kosong" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const imageUrls: string[] = [];

    // Upload multiple images to Supabase Storage
    for (const imageFile of imageFiles) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("shooting_locations")
        .upload(filePath, imageFile, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        // Clean up already uploaded images on error
        for (const url of imageUrls) {
          const path = url.split("/").slice(-2).join("/");
          await supabase.storage.from("shooting_locations").remove([path]);
        }
        return NextResponse.json(
          { error: `Upload error: ${uploadError.message}` },
          { status: 400 },
        );
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("shooting_locations").getPublicUrl(filePath);

      imageUrls.push(publicUrl);
    }

    // Insert location
    const { data: newLocation, error: insertError } = await supabase
      .from("shooting_locations")
      .insert({
        shooting_location_name: name.trim(),
        shooting_location_city: city?.trim() || "",
        shooting_location_price: price?.trim() || "",
        shooting_location_description: description?.trim() || "",
        shooting_location_area: area,
        shooting_location_pax: pax,
        shooting_location_rate: rate,
        shooting_location_image_url: imageUrls,
      })
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded images on database error
      for (const url of imageUrls) {
        const path = url.split("/").slice(-2).join("/");
        await supabase.storage.from("shooting_locations").remove([path]);
      }
      return NextResponse.json({ error: insertError.message }, { status: 400 });
    }

    // Insert location tags if any
    if (tags.length > 0 && newLocation) {
      // Get tag IDs from tag names
      const { data: tagRecords } = await supabase
        .from("tags")
        .select("tag_id, tag")
        .in("tag", tags);

      if (tagRecords && tagRecords.length > 0) {
        const locationTags = tagRecords.map(
          (tag: { tag_id: string; tag: string }) => ({
            shooting_location_id: newLocation.shooting_location_id,
            tag_id: tag.tag_id,
          }),
        );

        await supabase.from("shooting_location_tag").insert(locationTags);
      }
    }

    // Generate and store embedding (non-blocking)
    upsertLocationEmbedding({
      location_id: newLocation.shooting_location_id,
      name,
      city: city?.trim() || "",
      price: price?.trim() || "",
      description: description?.trim() || "",
      area,
      pax,
      rating: rate,
      tags,
      image_url: imageUrls[0],
    });

    return NextResponse.json(
      { message: "Lokasi berhasil ditambahkan", location: newLocation },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create location error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menambahkan lokasi" },
      { status: 500 },
    );
  }
}
