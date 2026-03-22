import { NextResponse } from "next/server";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error("OAuth code exchange error:", exchangeError);
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL("/login", requestUrl.origin));
  }

  const serviceRoleClient = createServiceRoleClient();

  const { data: existingProfile, error: existingProfileError } =
    await serviceRoleClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single<Pick<Profile, "role">>();

  if (existingProfileError && existingProfileError.code !== "PGRST116") {
    console.error("OAuth profile lookup error:", existingProfileError);
  }

  if (!existingProfile) {
    const { error: createProfileError } = await serviceRoleClient
      .from("profiles")
      .insert({
        user_id: user.id,
        role: "user",
        profile_image_url: "",
      });

    if (createProfileError) {
      console.error("OAuth profile insert error:", createProfileError);
    }
  }

  const { data: profile } = await serviceRoleClient
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single<Pick<Profile, "role">>();

  if (profile?.role === "admin") {
    return NextResponse.redirect(new URL("/admin", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
