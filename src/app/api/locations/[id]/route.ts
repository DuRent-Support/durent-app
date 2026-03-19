import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { upsertLocationEmbedding } from "@/lib/embedding";

// PUT update location by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const city = formData.get("city") as string;
    const price = formData.get("price") as string;
    const description = formData.get("description") as string;
    const area = parseFloat(formData.get("area") as string) || 0;
    const pax = parseInt(formData.get("pax") as string) || 0;
    const rate = parseFloat(formData.get("rate") as string) || 0;
    const tags = JSON.parse((formData.get("tags") as string) || "[]");
    const existingImageUrls = JSON.parse(
      (formData.get("existingImageUrls") as string) || "[]",
    );

    console.log("Test 1");
    const imageFiles: File[] = [];
    let index = 0;
    while (formData.has(`image_${index}`)) {
      const file = formData.get(`image_${index}`) as File;
      if (file && file.size > 0) {
        imageFiles.push(file);
      }
      index++;
    }
    console.log("Test 2");

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Nama lokasi tidak boleh kosong" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    console.log("Test 3");

    // Get existing location to manage old images
    const { data: existingLocation } = await supabase
      .from("shooting_locations")
      .select("shooting_location_image_url")
      .eq("shooting_location_id", id)
      .single();

    const oldImageUrls =
      (existingLocation?.shooting_location_image_url as string[]) || [];
    const newImageUrls: string[] = [...existingImageUrls];
    console.log("Test 4");

    // Delete removed images from storage
    const imagesToDelete = oldImageUrls.filter(
      (url) => !existingImageUrls.includes(url),
    );
    for (const url of imagesToDelete) {
      const path = url.split("/").slice(-2).join("/");
      await supabase.storage.from("shooting_locations").remove([path]);
    }
    console.log("Test 5");

    // Upload new images
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
        return NextResponse.json(
          { error: `Upload error: ${uploadError.message}` },
          { status: 400 },
        );
      }
      console.log("Test 6");

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("shooting_locations").getPublicUrl(filePath);

      newImageUrls.push(publicUrl);
    }

    console.log("Test 7");
    // Update location
    const { data: updatedLocation, error: updateError } = await supabase
      .from("shooting_locations")
      .update({
        shooting_location_name: name.trim(),
        shooting_location_city: city?.trim() || "",
        shooting_location_price: price?.trim() || "",
        shooting_location_description: description?.trim() || "",
        shooting_location_area: area,
        shooting_location_pax: pax,
        shooting_location_rate: rate,
        shooting_location_image_url: newImageUrls,
      })
      .eq("shooting_location_id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
    console.log("Test 8");

    // Update location tags
    // First, delete existing tags
    const { error: deleteTagsError } = await supabase
      .from("shooting_location_tag")
      .delete()
      .eq("shooting_location_id", id);

    if (deleteTagsError) {
      return NextResponse.json(
        {
          error: `Gagal menghapus relasi tag lama: ${deleteTagsError.message}`,
        },
        { status: 400 },
      );
    }

    // Then insert new tags
    if (tags.length > 0) {
      const { data: tagRecords, error: tagRecordsError } = await supabase
        .from("tags")
        .select("tag_id, tag")
        .in("tag", tags);

      if (tagRecordsError) {
        return NextResponse.json(
          { error: `Gagal mengambil data tag: ${tagRecordsError.message}` },
          { status: 400 },
        );
      }

      if (tagRecords && tagRecords.length > 0) {
        const locationTags = tagRecords.map(
          (tag: { tag_id: string; tag: string }) => ({
            shooting_location_id: id,
            tag_id: tag.tag_id,
          }),
        );

        const { error: insertTagsError } = await supabase
          .from("shooting_location_tag")
          .insert(locationTags);

        if (insertTagsError) {
          return NextResponse.json(
            {
              error: `Gagal menyimpan relasi tag baru: ${insertTagsError.message}`,
            },
            { status: 400 },
          );
        }
      }
    }
    console.log("Test 8");

    // Generate and store embedding (non-blocking)
    upsertLocationEmbedding({
      shooting_location_id: id,
      name,
      city: city?.trim() || "",
      price: price?.trim() || "",
      description: description?.trim() || "",
      area,
      pax,
      rate,
      tags,
      image_url: newImageUrls[0],
    });

    return NextResponse.json(
      { message: "Lokasi berhasil diupdate", location: updatedLocation },
      { status: 200 },
    );
  } catch (error) {
    console.error("Update location error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengupdate lokasi" },
      { status: 500 },
    );
  }
}

// DELETE location by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  console.log("Test 1");

  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get location to delete images from storage
    const { data: location } = await supabase
      .from("shooting_locations")
      .select("shooting_location_image_url")
      .eq("shooting_location_id", id)
      .single();

    // Delete all images from storage if exist
    if (location?.shooting_location_image_url) {
      const imageUrls = location.shooting_location_image_url as string[];
      for (const imageUrl of imageUrls) {
        const imagePath = imageUrl.split("/").slice(-2).join("/");
        await supabase.storage.from("shooting_locations").remove([imagePath]);
      }
    }
    console.log("Test 2");

    // Delete location tags first (foreign key constraint)
    await supabase
      .from("shooting_location_tag")
      .delete()
      .eq("shooting_location_id", id);

    // Delete location embeddings (foreign key constraint)
    await supabase
      .from("location_embeddings")
      .delete()
      .eq("shooting_location_id", id);

    console.log("Test 3");

    // Delete location
    const { error } = await supabase
      .from("shooting_locations")
      .delete()
      .eq("shooting_location_id", id);

    console.log("Test 3.5", error);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.log("Test 4");

    return NextResponse.json(
      { message: "Lokasi berhasil dihapus" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Delete location error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus lokasi" },
      { status: 500 },
    );
  }
}
