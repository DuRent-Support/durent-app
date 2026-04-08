import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const rawValue = metadata[key];
    if (typeof rawValue !== "string") {
      continue;
    }

    const value = rawValue.trim();
    if (value.length > 0) {
      return value;
    }
  }

  return null;
}

function resolveSafeNext(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith("/")) {
    return "/";
  }

  if (nextParam.startsWith("/login")) {
    return "/";
  }

  return nextParam;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = resolveSafeNext(url.searchParams.get("next"));

  const redirectUrl = new URL(url.origin);

  if (!code) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "Kode autentikasi tidak ditemukan.");
    return NextResponse.redirect(redirectUrl);
  }

  const supabase = await createClient();

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", exchangeError.message);
    return NextResponse.redirect(redirectUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set(
      "error",
      "Sesi login tidak tersedia setelah autentikasi Google.",
    );
    return NextResponse.redirect(redirectUrl);
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    readMetadataString(metadata, ["full_name", "name", "display_name"]) ??
    user.email?.split("@")[0]?.trim() ??
    "User";
  const avatarUrl = readMetadataString(metadata, ["avatar_url", "picture"]);
  const phone =
    readMetadataString(metadata, ["phone", "phone_number"]) ??
    (typeof user.phone === "string" && user.phone.trim().length > 0
      ? user.phone.trim()
      : null);

  const { error: upsertProfileError } = await supabase.from("profiles").upsert(
    {
      user_uuid: user.id,
      role: "user",
      full_name: fullName,
      avatar_url: avatarUrl,
      phone,
    },
    {
      onConflict: "user_uuid",
    },
  );

  if (upsertProfileError) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", upsertProfileError.message);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_uuid", user.id)
    .maybeSingle<Pick<Profile, "role">>();

  redirectUrl.pathname = profile?.role === "admin" ? "/admin" : next;
  return NextResponse.redirect(redirectUrl);
}
