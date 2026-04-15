import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type ProfileSettingsRow = {
  full_name: string;
  phone: string | null;
};

function normalizeFullName(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizePhoneForStorage(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");

  if (digits.startsWith("62")) {
    digits = digits.slice(2);
  }

  digits = digits.replace(/^0+/, "");

  if (!digits) {
    return null;
  }

  return `+62${digits}`;
}

function isPhoneLengthValid(normalizedPhone: string) {
  const digits = normalizedPhone.replace(/^\+62/, "");
  return digits.length >= 8 && digits.length <= 13;
}

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { userId: null, supabase };
  }

  return { userId: user.id, supabase };
}

export async function GET() {
  try {
    const { userId, supabase } = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "User belum login" },
        { status: 401 },
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_uuid", userId)
      .maybeSingle<ProfileSettingsRow>();

    if (error) {
      console.error("Settings profile fetch error:", error);
      return NextResponse.json(
        { message: "Gagal mengambil data profile" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { message: "Profile tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings profile GET error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat mengambil profile" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { userId, supabase } = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json(
        { message: "User belum login" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      fullName?: unknown;
      phone?: unknown;
    };

    const fullName = normalizeFullName(body?.fullName);
    const normalizedPhone = normalizePhoneForStorage(body?.phone);

    if (!fullName) {
      return NextResponse.json(
        { message: "Full name wajib diisi" },
        { status: 400 },
      );
    }

    if (!normalizedPhone) {
      return NextResponse.json(
        { message: "Phone number wajib diisi" },
        { status: 400 },
      );
    }

    if (!isPhoneLengthValid(normalizedPhone)) {
      return NextResponse.json(
        { message: "Phone number tidak valid" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: normalizedPhone,
      })
      .eq("user_uuid", userId)
      .select("full_name, phone")
      .single<ProfileSettingsRow>();
   
    if (error) {
      const isUniquePhoneViolation = error.code === "23505";

      if (isUniquePhoneViolation) {
        return NextResponse.json(
          { message: "Phone number sudah digunakan akun lain" },
          { status: 409 },
        );
      }

      console.error("Settings profile update error:", error);
      return NextResponse.json(
        { message: "Gagal menyimpan profile" },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Settings profile PUT error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat menyimpan profile" },
      { status: 500 },
    );
  }
}
