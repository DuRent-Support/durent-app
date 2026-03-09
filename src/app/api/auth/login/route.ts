import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { Profile } from "@/types";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password wajib diisi" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Fetch user profile to get role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", data.user.id)
      .single<Profile>();

    if (profileError || !profile) {
      console.error("Profile fetch error:", profileError);
      // Sign out user if profile not found
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Profile tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        message: "Login berhasil",
        user: data.user,
        session: data.session,
        profile: profile,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat login" },
      { status: 500 },
    );
  }
}
