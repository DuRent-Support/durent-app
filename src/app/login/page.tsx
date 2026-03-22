"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const onGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const redirectTo = `${window.location.origin}/auth/callback`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setIsLoading(false);
    } finally {
      router.refresh();
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Background image */}
      <Image
        src="/login-bg.webp"
        alt="Background"
        className="absolute inset-0 h-full w-full object-cover"
        fill
        priority
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />

      {/* Glass form card */}
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-border/20 p-8"
        style={{
          background: "hsla(0, 0%, 10%, 0.45)",
          backdropFilter: "blur(32px) saturate(130%)",
          WebkitBackdropFilter: "blur(32px) saturate(130%)",
          boxShadow:
            "0 16px 48px hsla(0, 0%, 0%, 0.5), inset 0 1px 0 hsla(0, 0%, 100%, 0.06)",
        }}
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary glow-primary">
            <Film className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            DuRent
          </h1>
          <p className="text-sm text-muted-foreground">Masuk ke akun kamu</p>
        </div>

        <div className="space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full gap-2 font-semibold"
            onClick={onGoogleSignIn}
            disabled={isLoading}
          >
            <svg
              aria-hidden="true"
              className="h-[18px] w-[18px]"
              viewBox="0 0 24 24"
            >
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.2-1.4 3.6-5.5 3.6-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.1 14.7 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z"
              />
            </svg>
            {isLoading ? "Mengarahkan..." : "Masuk dengan Google"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Dengan masuk, kamu menyetujui penggunaan akun Google untuk
            autentikasi.
          </p>
        </div>

        <div className="mt-6 text-center">
          <span className="text-sm text-muted-foreground">
            Belum punya akun?{" "}
          </span>
          <Link
            href="/register"
            className="text-sm font-medium text-foreground hover:underline"
          >
            Daftar
          </Link>
        </div>
      </div>
    </div>
  );
}
