import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types";

function resolveSafeNext(nextParam: string | null) {
  if (!nextParam || !nextParam.startsWith("/")) {
    return "/";
  }

  if (nextParam.startsWith("/login") || nextParam.startsWith("/register")) {
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

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code,
  );

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle<Pick<Profile, "role">>();

  redirectUrl.pathname = profile?.role === "admin" ? "/admin" : next;
  return NextResponse.redirect(redirectUrl);
}
