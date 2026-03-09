"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  //tambahkan state auhtentcation lagi auth atau tidak

  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Login gagal");
      }

      // Success - redirect based on user role
      if (result.profile?.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setIsLoading(false);
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      className="glass-input h-11 border-border/30 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="glass-input h-11 border-border/30 bg-transparent pr-10 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                        disabled={isLoading}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isLoading}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                Lupa password?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? "Memproses..." : "Masuk"}
            </Button>
          </form>
        </Form>

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
