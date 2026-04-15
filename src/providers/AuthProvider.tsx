"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import type { Profile, UserRole } from "@/types";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  refreshAuth: () => Promise<void>;
};

const ROLE_FETCH_RETRY_DELAYS_MS = [0, 250, 700] as const;

const AuthContext = createContext<AuthContextValue | null>(null);

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const requestIdRef = useRef(0);

  const resolveRole = useCallback(
    async (userId: string) => {
      // console.log("Resolving role for user ID:", userId);
      for (const retryDelayMs of ROLE_FETCH_RETRY_DELAYS_MS) {
        if (retryDelayMs > 0) {
          await delay(retryDelayMs);
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("user_uuid", userId)
          .maybeSingle<Pick<Profile, "role">>();

        if (error) {
          console.error("Role fetch error:", error.message);
          continue;
        }

        if (data?.role) {
          return data.role;
        }
      }

      return null;
    },
    [supabase],
  );

  const syncAuthState = useCallback(
    async (nextUser: User | null) => {
      const requestId = ++requestIdRef.current;

      if (!nextUser) {
        setUser(null);
        setRole(null);
        setStatus("unauthenticated");
        return;
      }

      // setStatus("loading");
      setUser(nextUser);

      const nextRole = await resolveRole(nextUser.id);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setRole(nextRole);
      setStatus("authenticated");
    },
    [resolveRole],
  );

  const refreshAuth = useCallback(async () => {
    const {
      data: { user: latestUser },
    } = await supabase.auth.getUser();

    await syncAuthState(latestUser);
  }, [supabase, syncAuthState]);

  useEffect(() => {
    let isMounted = true;
    console.log("AuthProvider initializing, checking current auth state...");
    const bootstrap = async () => {
      const {
        data: { user: latestUser },
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      await syncAuthState(latestUser);
    };
    // console.log("test");

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      // if (_event === "SIGNED_IN") {
      //   console.log("test masuk");
      //   if (!session?.user) return;

      //   if (user?.id !== session.user.id) {
      //     // setUser(session.user);
      //     return;
      //   }
      //   return;
      // }

      // if (_event === "SIGNED_OUT") {
      //   setUser(null);
      // }

      console.log("Auth state changed:", _event);
      void syncAuthState(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, syncAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      role,
      isAdmin: role === "admin",
      refreshAuth,
    }),
    [status, user, role, refreshAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
