import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase/server";

import { requireAdmin } from "../../../master-data/_shared";

const MEDIA_BUCKET = "media";
const MEDIA_FOLDER = "private/expendable-images";
const MAX_FILE_SIZE_BYTES = 1024 * 1024;

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return admin.response;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: "File gambar wajib diisi." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { message: "ada gambar yang terlalu besar" },
        { status: 400 },
      );
    }

    const serviceRoleClient = createServiceRoleClient();

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `${MEDIA_FOLDER}/${fileName}`;

    const uploadResult = await serviceRoleClient.storage
      .from(MEDIA_BUCKET)
      .upload(filePath, file, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadResult.error) {
      return NextResponse.json(
        { message: uploadResult.error.message },
        { status: 400 },
      );
    }

    const signedResult = await serviceRoleClient.storage
      .from(MEDIA_BUCKET)
      .createSignedUrl(filePath, 60 * 60);

    if (signedResult.error) {
      return NextResponse.json(
        { message: signedResult.error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        message: "Upload gambar berhasil.",
        path: filePath,
        signed_url: signedResult.data.signedUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Upload admin expendable image error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat upload gambar." },
      { status: 500 },
    );
  }
}
